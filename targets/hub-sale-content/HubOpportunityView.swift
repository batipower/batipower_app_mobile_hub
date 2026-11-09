import SwiftUI

/// Carte « Opportunité » (catégorie `HUB_OPPORTUNITY`) : acceptation, refus ou abandon d'un produit
/// négocié, avec le prix attendu, le prix proposé et son auteur.
///
/// Aucune marge ici : seuls les prix de négociation (HT) voyagent dans `data`.

// MARK: - Données

struct HubOpportunityProposal: Identifiable {
  let id: Int
  let priceHT: Double?
  let by: String?
  let at: String?
}

struct HubOpportunityPayload {
  let identifier: String
  let event: String
  let designation: String
  let reference: String?
  let distributorName: String?
  let subsidiaryName: String?
  let requestedPriceHT: Double?
  let proposedPriceHT: Double?
  let proposedByName: String?
  let proposedAt: String?
  let obtainedPriceHT: Double?
  let gapHT: Double?
  let gapPercent: Double?
  let resolvedByName: String?
  let proposals: [HubOpportunityProposal]

  init(identifier: String, userInfo: [AnyHashable: Any]) {
    self.identifier = identifier
    event = PushPayload.string(userInfo, "event") ?? "ACCEPTED"
    designation = PushPayload.string(userInfo, "designation") ?? "Produit"
    reference = PushPayload.string(userInfo, "reference")
    distributorName = PushPayload.string(userInfo, "distributorName")
    subsidiaryName = PushPayload.string(userInfo, "subsidiaryName")
    requestedPriceHT = PushPayload.number(userInfo, "requestedPriceHT")
    proposedPriceHT = PushPayload.number(userInfo, "proposedPriceHT")
    proposedByName = PushPayload.string(userInfo, "proposedByName")
    proposedAt = PushPayload.string(userInfo, "proposedAt")
    obtainedPriceHT = PushPayload.number(userInfo, "obtainedPriceHT")
    gapHT = PushPayload.number(userInfo, "gapHT")
    gapPercent = PushPayload.number(userInfo, "gapPercent")
    resolvedByName = PushPayload.string(userInfo, "resolvedByName")
    proposals = PushPayload.objects(userInfo, "proposals").enumerated().map { index, item in
      HubOpportunityProposal(
        id: index,
        priceHT: PushPayload.numberValue(item["priceHT"]),
        by: PushPayload.stringValue(item["by"]),
        at: PushPayload.stringValue(item["at"])
      )
    }
  }

  var title: String {
    switch event {
    case "AUTO_ACCEPTED": return "ACCEPTÉ AUTOMATIQUEMENT"
    case "REFUSED": return "REFUSÉ"
    case "ABANDONED": return "ABANDONNÉ"
    default: return "ACCEPTÉ"
    }
  }

  var isNegative: Bool { event == "REFUSED" || event == "ABANDONED" }

  /// Qui a résolu : un utilisateur, ou « Système » pour une acceptation automatique.
  var resolvedBy: String {
    if let resolvedByName, !resolvedByName.isEmpty { return resolvedByName }
    return event == "AUTO_ACCEPTED" ? "Système" : "—"
  }
}

// MARK: - Vues

struct HubOpportunityRoot: View {
  let payload: HubOpportunityPayload
  let onOpen: () -> Void

  var body: some View {
    HubOpportunityView(payload: payload, onOpen: onOpen)
      .id(payload.identifier)
  }
}

struct HubOpportunityView: View {
  let payload: HubOpportunityPayload
  let onOpen: () -> Void

  private var accent: Color { payload.isNegative ? Color(hex: 0xF87171) : Color(hex: 0x94C83E) }

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .center, spacing: 12) {
        VStack(alignment: .leading, spacing: 3) {
          Text(payload.title)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(accent)
          Text(payload.designation)
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(.white)
            .lineLimit(2)
          if let line = originLine {
            Text(line)
              .font(.system(size: 12, weight: .medium))
              .foregroundStyle(Color.white.opacity(0.6))
              .lineLimit(1)
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
        priceCard(label: "PRIX ATTENDU", value: PushPayload.eur(payload.requestedPriceHT, suffix: " HT"), tint: nil)
        priceCard(
          label: "PRIX PROPOSÉ",
          value: PushPayload.eur(payload.proposedPriceHT, suffix: " HT"),
          detail: proposedDetail,
          tint: nil
        )
      }

      HStack(alignment: .top, spacing: 10) {
        priceCard(
          label: payload.isNegative ? "ÉCART" : "PRIX OBTENU",
          value: payload.isNegative
            ? gapText
            : PushPayload.eur(payload.obtainedPriceHT ?? payload.proposedPriceHT, suffix: " HT"),
          detail: payload.isNegative ? nil : gapText,
          tint: accent
        )
        priceCard(label: "DÉCIDÉ PAR", value: payload.resolvedBy, tint: nil)
      }

      if !payload.proposals.isEmpty {
        VStack(alignment: .leading, spacing: 6) {
          Text("DERNIÈRES PROPOSITIONS")
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(Color.white.opacity(0.6))
          ForEach(payload.proposals) { proposal in
            HStack(spacing: 8) {
              Text(PushPayload.eur(proposal.priceHT, suffix: " HT"))
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.white)
              Text(proposalAuthor(proposal))
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.6))
                .lineLimit(1)
              Spacer(minLength: 0)
            }
          }
        }
      }

      Button(action: onOpen) {
        HStack(spacing: 8) {
          Text("Ouvrir l'opportunité")
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
      .accessibilityLabel("Ouvrir l'opportunité")
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .background(Color(hex: 0x131921))
  }

  private var originLine: String? {
    let parts = [payload.distributorName, payload.subsidiaryName, payload.reference]
      .compactMap { $0 }
      .filter { !$0.isEmpty }
    var seen = Set<String>()
    let unique = parts.filter { seen.insert($0).inserted }
    return unique.isEmpty ? nil : unique.joined(separator: " · ")
  }

  private var proposedDetail: String? {
    var parts: [String] = []
    if let by = payload.proposedByName, !by.isEmpty { parts.append("par \(by)") }
    if let date = PushPayload.shortDate(payload.proposedAt) { parts.append(date) }
    return parts.isEmpty ? nil : parts.joined(separator: " · ")
  }

  private var gapText: String {
    guard let gap = payload.gapHT else { return "—" }
    let sign = gap > 0 ? "+" : ""
    let euros = "\(sign)\(PushPayload.eur(gap))"
    guard let percent = payload.gapPercent else { return euros }
    return "\(euros) (\(sign)\(PushPayload.pct(percent)))"
  }

  private func proposalAuthor(_ proposal: HubOpportunityProposal) -> String {
    [proposal.by, PushPayload.shortDate(proposal.at)]
      .compactMap { $0 }
      .filter { !$0.isEmpty }
      .joined(separator: " · ")
  }

  private func priceCard(label: String, value: String, detail: String? = nil, tint: Color?) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(label)
        .font(.system(size: 10, weight: .bold))
        .foregroundStyle(Color.white.opacity(0.6))
      Text(value)
        .font(.system(size: 16, weight: .heavy))
        .foregroundStyle(tint ?? .white)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
      if let detail {
        Text(detail)
          .font(.system(size: 11, weight: .medium))
          .foregroundStyle(Color.white.opacity(0.6))
          .lineLimit(2)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .frame(minHeight: 44, alignment: .topLeading)
    .padding(10)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill((tint ?? Color.white).opacity(tint == nil ? 0.06 : 0.14))
    )
  }
}
