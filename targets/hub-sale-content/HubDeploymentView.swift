import SwiftUI

/// Carte « Produit déployé » (catégorie `HUB_DEPLOYMENT`) : statut et prix de vente TTC par canal,
/// et rappel de la négociation. Les marges par canal sont dans la page « Déploiement » de l'app
/// (jamais dans la notification).

// MARK: - Données

struct HubDeploymentChannelStatus: Identifiable {
  let id: String
  let label: String
  let status: String
  let priceTTC: Double?
}

struct HubDeploymentPayload {
  let identifier: String
  let reference: String
  let designation: String
  let channels: [HubDeploymentChannelStatus]
  let hasNegotiation: Bool
  let requestedPriceHT: Double?
  let proposedPriceHT: Double?
  let proposedByName: String?
  let subsidiaryName: String?
  let obtainedPriceHT: Double?

  private static let channelLabels: [(key: String, label: String)] = [
    ("amazon", "Amazon"),
    ("manomano", "ManoMano"),
    ("leroymerlin", "Leroy Merlin"),
  ]

  init(identifier: String, userInfo: [AnyHashable: Any]) {
    self.identifier = identifier
    reference = PushPayload.string(userInfo, "reference") ?? "—"
    designation = PushPayload.string(userInfo, "designation") ?? "Produit"

    let deploy = PushPayload.object(userInfo, "deploy") ?? [:]
    channels = Self.channelLabels.map { entry in
      let item = deploy[entry.key] as? [AnyHashable: Any]
      return HubDeploymentChannelStatus(
        id: entry.key,
        label: entry.label,
        status: PushPayload.stringValue(item?["status"]) ?? "none",
        priceTTC: PushPayload.numberValue(item?["priceTTC"])
      )
    }

    let negotiation = PushPayload.object(userInfo, "negotiation")
    hasNegotiation = negotiation != nil
    requestedPriceHT = PushPayload.numberValue(negotiation?["requestedPriceHT"])
    proposedPriceHT = PushPayload.numberValue(negotiation?["proposedPriceHT"])
    proposedByName = PushPayload.stringValue(negotiation?["proposedByName"])
    subsidiaryName = PushPayload.stringValue(negotiation?["subsidiaryName"])
    obtainedPriceHT = PushPayload.numberValue(negotiation?["obtainedPriceHT"])
  }
}

// MARK: - Vues

struct HubDeploymentRoot: View {
  let payload: HubDeploymentPayload
  let onOpen: () -> Void

  var body: some View {
    HubDeploymentView(payload: payload, onOpen: onOpen)
      .id(payload.identifier)
  }
}

struct HubDeploymentView: View {
  let payload: HubDeploymentPayload
  let onOpen: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .center, spacing: 12) {
        VStack(alignment: .leading, spacing: 3) {
          Text("PRODUIT DÉPLOYÉ")
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(Color(hex: 0x94C83E))
          Text(payload.designation)
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(.white)
            .lineLimit(2)
          Text(payload.reference)
            .font(.system(size: 13, weight: .medium, design: .monospaced))
            .foregroundStyle(Color.white.opacity(0.6))
        }
        Spacer(minLength: 0)
        Image("hubLogo")
          .resizable()
          .scaledToFit()
          .frame(width: 28, height: 28)
          .accessibilityLabel("Batipower Pro")
      }

      VStack(spacing: 8) {
        ForEach(payload.channels) { channel in
          channelRow(channel)
        }
      }

      if payload.hasNegotiation {
        negotiationCard
      }

      Button(action: onOpen) {
        HStack(spacing: 8) {
          Text("Voir le déploiement")
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
      .accessibilityLabel("Voir le déploiement")
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .background(Color(hex: 0x131921))
  }

  private func channelRow(_ channel: HubDeploymentChannelStatus) -> some View {
    let (icon, tint, text) = Self.describe(channel.status)
    return HStack(spacing: 10) {
      Image(systemName: icon)
        .font(.system(size: 14, weight: .semibold))
        .foregroundStyle(tint)
        .frame(width: 20)
      Text(channel.label)
        .font(.system(size: 14, weight: .semibold))
        .foregroundStyle(.white)
      Spacer(minLength: 0)
      VStack(alignment: .trailing, spacing: 1) {
        Text(channel.priceTTC.map { PushPayload.eur($0, suffix: " TTC") } ?? "—")
          .font(.system(size: 14, weight: .bold))
          .foregroundStyle(.white)
        Text(text)
          .font(.system(size: 11, weight: .medium))
          .foregroundStyle(tint)
      }
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(Color.white.opacity(0.06))
    )
  }

  private var negotiationCard: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("NÉGOCIATION")
        .font(.system(size: 10, weight: .bold))
        .foregroundStyle(Color.white.opacity(0.6))
      HStack(alignment: .top, spacing: 10) {
        negotiationValue("Attendu", PushPayload.eur(payload.requestedPriceHT, suffix: " HT"))
        negotiationValue("Proposé", PushPayload.eur(payload.proposedPriceHT, suffix: " HT"))
        negotiationValue("Obtenu", PushPayload.eur(payload.obtainedPriceHT, suffix: " HT"))
      }
      if let by = proposedByLine {
        Text(by)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(Color.white.opacity(0.6))
          .lineLimit(1)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(10)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(Color(hex: 0x94C83E).opacity(0.14))
    )
  }

  private func negotiationValue(_ label: String, _ value: String) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(label)
        .font(.system(size: 10, weight: .semibold))
        .foregroundStyle(Color.white.opacity(0.6))
      Text(value)
        .font(.system(size: 13, weight: .heavy))
        .foregroundStyle(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var proposedByLine: String? {
    let parts = [payload.proposedByName, payload.subsidiaryName]
      .compactMap { $0 }
      .filter { !$0.isEmpty }
    return parts.isEmpty ? nil : "Proposé par \(parts.joined(separator: " · "))"
  }

  private static func describe(_ status: String) -> (String, Color, String) {
    switch status {
    case "success": return ("checkmark.circle.fill", Color(hex: 0x94C83E), "Déployé")
    case "skipped": return ("arrow.triangle.2.circlepath", Color(hex: 0xFBBF24), "Déjà en ligne")
    case "error": return ("xmark.circle.fill", Color(hex: 0xF87171), "Échec")
    default: return ("minus.circle", Color.white.opacity(0.4), "Non déployé")
    }
  }
}
