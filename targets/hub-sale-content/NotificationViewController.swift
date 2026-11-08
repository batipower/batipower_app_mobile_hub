import SwiftUI
import UIKit
import UserNotifications
import UserNotificationsUI

/// Carte « Nouvelle vente » affichée à l'appui long sur la notification (catégorie `HUB_SALE`).
///
/// La marge n'est jamais dans le texte de la notification (visible écran verrouillé) : elle voyage
/// dans `data` et n'est affichée ici qu'après un appui sur l'oeil, puis re-masquée à chaque nouvelle
/// notification.
final class NotificationViewController: UIViewController, UNNotificationContentExtension {
  private var hostingController: UIHostingController<HubSaleRoot>?

  func didReceive(_ notification: UNNotification) {
    let content = notification.request.content
    let image = content.attachments.first.flatMap { Self.loadImage(from: $0) }
    let payload = HubSalePayload(
      identifier: notification.request.identifier,
      userInfo: content.userInfo
    )

    let root = HubSaleRoot(
      payload: payload,
      image: image,
      onOpen: { [weak self] in self?.extensionContext?.performNotificationDefaultAction() }
    )
    if let hostingController {
      hostingController.rootView = root
      updatePreferredSize()
      return
    }

    let host = UIHostingController(rootView: root)
    host.view.backgroundColor = .clear
    addChild(host)
    host.view.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(host.view)
    NSLayoutConstraint.activate([
      host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      host.view.topAnchor.constraint(equalTo: view.topAnchor),
      host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
    host.didMove(toParent: self)
    hostingController = host
    updatePreferredSize()
  }

  private func updatePreferredSize() {
    let width = view.bounds.width > 0 ? view.bounds.width : UIScreen.main.bounds.width
    let fitted = hostingController?.sizeThatFits(
      in: CGSize(width: width, height: UIView.layoutFittingExpandedSize.height)
    )
    preferredContentSize = CGSize(width: width, height: max(fitted?.height ?? 260, 240))
  }

  private static func loadImage(from attachment: UNNotificationAttachment) -> UIImage? {
    guard attachment.url.startAccessingSecurityScopedResource() else { return nil }
    defer { attachment.url.stopAccessingSecurityScopedResource() }
    return UIImage(contentsOfFile: attachment.url.path)
  }
}

// MARK: - Données

struct HubSalePayload {
  let identifier: String
  let orderReference: String?
  let productName: String
  let totalPaidTTC: Double?
  let margeEstimeeHT: Double?
  let tauxMarge: Double?
  /// `true` : prix d'achat, poids ou grille de transport manquant, la marge n'est qu'une estimation.
  let incomplete: Bool
  /// `mobile`, `tablet` ou `desktop` ; `nil` si l'appareil du client est inconnu.
  let device: String?
  let promoUsed: Bool
  let promoCode: String?
  let promoDiscountTTC: Double?

  init(identifier: String, userInfo: [AnyHashable: Any]) {
    self.identifier = identifier
    orderReference = HubSalePayload.string(userInfo, "orderReference")
    productName = HubSalePayload.string(userInfo, "productName") ?? "Produit"
    totalPaidTTC = HubSalePayload.number(userInfo, "totalPaidTTC")
    margeEstimeeHT = HubSalePayload.number(userInfo, "margeEstimeeHT")
    tauxMarge = HubSalePayload.number(userInfo, "tauxMarge")
    // Absent d'un push d'une ancienne version du backend : on garde alors « MARGE EST. ».
    incomplete = HubSalePayload.string(userInfo, "incomplete").map { $0 == "true" } ?? true
    device = HubSalePayload.string(userInfo, "device")
    promoUsed = HubSalePayload.string(userInfo, "promoUsed") == "true"
    promoCode = HubSalePayload.string(userInfo, "promoCode")
    promoDiscountTTC = HubSalePayload.number(userInfo, "promoDiscountTTC")
  }

  private static func lookup(_ userInfo: [AnyHashable: Any], _ key: String) -> Any? {
    if let value = userInfo[key] { return value }
    if let nested = dict(userInfo, "body"), let value = nested[key] { return value }
    if let nested = dict(userInfo, "data"), let value = nested[key] { return value }
    return nil
  }

  private static func dict(_ userInfo: [AnyHashable: Any], _ key: String) -> [AnyHashable: Any]? {
    if let value = userInfo[key] as? [AnyHashable: Any] { return value }
    if let raw = userInfo[key] as? String,
       let data = raw.data(using: .utf8),
       let parsed = try? JSONSerialization.jsonObject(with: data) as? [AnyHashable: Any] {
      return parsed
    }
    return nil
  }

  private static func string(_ userInfo: [AnyHashable: Any], _ key: String) -> String? {
    guard let value = lookup(userInfo, key) else { return nil }
    if let value = value as? String, !value.isEmpty { return value }
    if let value = value as? NSNumber { return value.stringValue }
    return nil
  }

  private static func number(_ userInfo: [AnyHashable: Any], _ key: String) -> Double? {
    guard let value = lookup(userInfo, key) else { return nil }
    if let value = value as? Double { return value }
    if let value = value as? Int { return Double(value) }
    if let value = value as? NSNumber { return value.doubleValue }
    if let value = value as? String {
      return Double(value.replacingOccurrences(of: ",", with: "."))
    }
    return nil
  }
}

// MARK: - Vues

/// Racine identifiée par la notification : l'état de la carte (marge dévoilée) repart de zéro
/// à chaque nouvelle notification affichée dans la même extension.
struct HubSaleRoot: View {
  let payload: HubSalePayload
  let image: UIImage?
  let onOpen: () -> Void

  var body: some View {
    HubSaleView(payload: payload, image: image, onOpen: onOpen)
      .id(payload.identifier)
  }
}

struct HubSaleView: View {
  let payload: HubSalePayload
  let image: UIImage?
  let onOpen: () -> Void

  @State private var marginRevealed = false

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .center, spacing: 12) {
        thumbnail
        VStack(alignment: .leading, spacing: 3) {
          Text("NOUVELLE VENTE")
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(Color(hex: 0x94C83E))
          Text(payload.productName)
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(.white)
            .lineLimit(2)
          if let reference = payload.orderReference, !reference.isEmpty {
            Text(reference)
              .font(.system(size: 13, weight: .medium, design: .monospaced))
              .foregroundStyle(Color.white.opacity(0.6))
          }
        }
        Spacer(minLength: 0)
        Image("hubLogo")
          .resizable()
          .scaledToFit()
          .frame(width: 28, height: 28)
          .accessibilityLabel("Batipower Pro")
      }

      HStack(alignment: .top, spacing: 10) {
        priceCard
        marginCard
      }

      if !badges.isEmpty {
        HStack(spacing: 8) {
          ForEach(badges) { badge in
            HStack(spacing: 6) {
              Image(systemName: badge.icon)
                .font(.system(size: 12, weight: .semibold))
              Text(badge.text)
                .font(.system(size: 12, weight: .semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Capsule().fill(Color.white.opacity(0.1)))
          }
          Spacer(minLength: 0)
        }
      }

      Button(action: onOpen) {
        HStack(spacing: 8) {
          Text("Ouvrir dans le Cockpit")
            .font(.system(size: 15, weight: .bold))
          Image(systemName: "arrow.right")
            .font(.system(size: 13, weight: .bold))
        }
        .foregroundStyle(Color(hex: 0x131921))
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(
          RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(Color(hex: 0x94C83E))
        )
      }
      .buttonStyle(.plain)
      .accessibilityLabel("Ouvrir dans le Cockpit")
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .background(Color(hex: 0x131921))
  }

  private var thumbnail: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(Color(hex: 0xF1F5F9))
      if let image {
        Image(uiImage: image)
          .resizable()
          .scaledToFit()
          .padding(8)
      } else {
        Text("—")
          .font(.system(size: 13, weight: .bold))
          .foregroundStyle(Color(hex: 0x94A3B8))
      }
    }
    .frame(width: 88, height: 88)
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }

  private var priceCard: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("PRIX VENDU TTC")
        .font(.system(size: 10, weight: .bold))
        .foregroundStyle(Color.white.opacity(0.6))
      Text(Self.eur(payload.totalPaidTTC))
        .font(.system(size: 16, weight: .heavy))
        .foregroundStyle(.white)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .frame(minHeight: 44, alignment: .topLeading)
    .padding(10)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(Color.white.opacity(0.06))
    )
  }

  private var marginCard: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(alignment: .center, spacing: 4) {
        Text(payload.incomplete ? "MARGE EST." : "MARGE")
          .font(.system(size: 10, weight: .bold))
          .foregroundStyle(Color.white.opacity(0.6))
        Spacer(minLength: 0)
        Button {
          marginRevealed.toggle()
        } label: {
          Image(systemName: marginRevealed ? "eye.slash" : "eye")
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Color(hex: 0x94C83E))
            .frame(width: 32, height: 24)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(marginRevealed ? "Masquer la marge" : "Afficher la marge")
      }
      Text(marginText)
        .font(.system(size: 16, weight: .heavy))
        .foregroundStyle(Color(hex: 0x94C83E))
        .lineLimit(2)
        .minimumScaleFactor(0.8)
        .accessibilityLabel(marginRevealed ? marginText : "Marge masquée")
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .frame(minHeight: 44, alignment: .topLeading)
    .padding(10)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(Color(hex: 0x94C83E).opacity(0.14))
    )
  }

  /// Pastilles toujours visibles (non sensibles) : appareil du client et code promo utilisé.
  private struct Badge: Identifiable {
    let icon: String
    let text: String
    var id: String { text }
  }

  private var badges: [Badge] {
    var items: [Badge] = []
    switch payload.device {
    case "mobile": items.append(Badge(icon: "iphone", text: "Smartphone"))
    case "tablet": items.append(Badge(icon: "ipad", text: "Tablette"))
    case "desktop": items.append(Badge(icon: "desktopcomputer", text: "Desktop"))
    default: break
    }
    if payload.promoUsed {
      var label = payload.promoCode.map { "Code promo : \($0)" } ?? "Code promo utilisé"
      if let discount = payload.promoDiscountTTC, discount > 0 {
        label += " (-\(Self.eur(discount)))"
      }
      items.append(Badge(icon: "tag", text: label))
    }
    return items
  }

  /// `•••• €` tant que l'oeil n'a pas été touché (même masque que le `MarginToggle` du Cockpit).
  private var marginText: String {
    guard marginRevealed else { return "•••• €" }
    let rate = payload.tauxMarge.map { " · \(Self.pct($0))" } ?? ""
    return Self.eur(payload.margeEstimeeHT, suffix: rate)
  }

  private static func eur(_ value: Double?, suffix: String = "") -> String {
    guard let value else { return "—" }
    let formatted = String(format: "%.2f", value).replacingOccurrences(of: ".", with: ",")
    return "\(formatted) €\(suffix)"
  }

  private static func pct(_ value: Double) -> String {
    let formatted = String(format: "%.1f", value).replacingOccurrences(of: ".", with: ",")
    return "\(formatted) %"
  }
}

private extension Color {
  init(hex: UInt, opacity: Double = 1) {
    self.init(
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255,
      opacity: opacity
    )
  }
}
