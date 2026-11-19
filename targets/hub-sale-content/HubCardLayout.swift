import SwiftUI

/// Mise en page adaptative partagée par les trois cartes de l'extension (vente, opportunité,
/// déploiement).
///
/// La largeur réelle de la carte (celle de la vue de l'extension, pas celle de l'écran) pilote un
/// mode compact sous `compactBreakpoint` : logo masqué, vignette réduite, libellés sur trois
/// lignes. Les rangées de cartes de chiffres et les pastilles, elles, s'empilent d'elles-mêmes
/// quand leur contenu ne tient plus sur une ligne (`HubAdaptiveStack`), quelle que soit la largeur.
enum HubCardLayout {
  /// Sous cette largeur (en points), la carte passe en mode compact : iPhone SE, mini et écrans de
  /// 6,1 pouces. Une valeur à ajuster après un essai sur simulateur (voir `samples/README.md`).
  static let compactBreakpoint: CGFloat = 390

  static func isCompact(width: CGFloat) -> Bool {
    width > 0 && width < compactBreakpoint
  }
}

private struct HubCardCompactKey: EnvironmentKey {
  static let defaultValue = false
}

extension EnvironmentValues {
  /// `true` quand la carte est étroite : voir `HubCardLayout.compactBreakpoint`.
  var hubCardCompact: Bool {
    get { self[HubCardCompactKey.self] }
    set { self[HubCardCompactKey.self] = newValue }
  }
}

/// Largeur courante de la carte, mise à jour par `NotificationViewController` à chaque passe de
/// mise en page de l'extension.
final class HubCardModel: ObservableObject {
  @Published var width: CGFloat

  init(width: CGFloat = 0) {
    self.width = width
  }
}

/// Enveloppe commune des cartes : diffuse le mode compact et plafonne la taille du texte
/// dynamique pour que la carte reste lisible sans déborder de la notification.
struct HubCardContainer: View {
  @ObservedObject var model: HubCardModel
  let content: AnyView

  var body: some View {
    content
      .environment(\.hubCardCompact, HubCardLayout.isCompact(width: model.width))
      .dynamicTypeSize(...DynamicTypeSize.xLarge)
  }
}

/// Rangée horizontale quand elle tient, sinon pile verticale. Le contenu est construit deux fois :
/// l'état (ex. marge dévoilée) doit donc vivre dans la vue parente, jamais dans les éléments.
struct HubAdaptiveStack<Content: View>: View {
  let spacing: CGFloat
  @ViewBuilder let content: () -> Content

  init(spacing: CGFloat = 10, @ViewBuilder content: @escaping () -> Content) {
    self.spacing = spacing
    self.content = content
  }

  var body: some View {
    ViewThatFits(in: .horizontal) {
      HStack(alignment: .top, spacing: spacing) { content() }
      VStack(alignment: .leading, spacing: spacing) { content() }
    }
  }
}

#if DEBUG
/// Cadre d'aperçu : fixe la largeur de la carte et le mode compact correspondant.
struct HubCardPreviewHost<Content: View>: View {
  let width: CGFloat
  @ViewBuilder let content: () -> Content

  var body: some View {
    content()
      .frame(width: width)
      .environment(\.hubCardCompact, HubCardLayout.isCompact(width: width))
      .dynamicTypeSize(...DynamicTypeSize.xLarge)
      .background(Color(hex: 0x131921))
  }
}
#endif

#if DEBUG
/// Données d'aperçu : un nom long et tous les champs renseignés, le pire cas pour la hauteur.
enum HubCardSamples {
  static let sale: [AnyHashable: Any] = [
    "orderReference": "BP-2026-004512",
    "productName": "Perceuse-visseuse à percussion sans fil 18 V brushless, 2 batteries 5 Ah et coffret",
    "totalPaidTTC": 289.9,
    "margeEstimeeHT": 41.37,
    "tauxMarge": 17.1,
    "incomplete": "false",
    "device": "mobile",
    "promoUsed": "true",
    "promoCode": "BIENVENUE10",
    "promoDiscountTTC": 29.0,
  ]

  static let opportunity: [AnyHashable: Any] = [
    "event": "ACCEPTED",
    "designation": "Perceuse-visseuse à percussion sans fil 18 V brushless, 2 batteries 5 Ah et coffret",
    "reference": "DCD796P2",
    "distributorName": "Distributeur Nord",
    "subsidiaryName": "Filiale Lille",
    "requestedPriceHT": 142.5,
    "proposedPriceHT": 149.0,
    "proposedByName": "Camille Martin",
    "proposedAt": "2026-11-12T09:30:00.000Z",
    "obtainedPriceHT": 146.0,
    "gapHT": 3.5,
    "gapPercent": 2.4,
    "resolvedByName": "Alexandre Dupont",
    "proposals": [
      ["priceHT": 149.0, "by": "Camille Martin", "at": "2026-11-12T09:30:00.000Z"],
      ["priceHT": 146.0, "by": "Alexandre Dupont", "at": "2026-11-13T14:05:00.000Z"],
    ],
  ]

  static let deployment: [AnyHashable: Any] = [
    "reference": "DCD796P2",
    "designation": "Perceuse-visseuse à percussion sans fil 18 V brushless, 2 batteries 5 Ah et coffret",
    "deploy": [
      "amazon": ["status": "success", "priceTTC": 289.9],
      "manomano": ["status": "skipped", "priceTTC": 279.0],
      "leroymerlin": ["status": "error", "priceTTC": 1234.56],
    ],
    "negotiation": [
      "requestedPriceHT": 142.5,
      "proposedPriceHT": 149.0,
      "obtainedPriceHT": 146.0,
      "proposedByName": "Camille Martin",
      "subsidiaryName": "Filiale Lille",
    ],
  ]
}
#endif
