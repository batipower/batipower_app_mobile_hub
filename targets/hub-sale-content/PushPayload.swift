import SwiftUI

/// Lecture tolérante du `userInfo` d'un push Expo, partagée par les cartes de l'extension.
///
/// Expo place les champs `data` soit à la racine, soit dans `body` / `data` (objet ou JSON sérialisé) :
/// on cherche donc la clé à ces trois endroits.
enum PushPayload {
  static func lookup(_ userInfo: [AnyHashable: Any], _ key: String) -> Any? {
    if let value = userInfo[key] { return value }
    if let nested = dict(userInfo, "body"), let value = nested[key] { return value }
    if let nested = dict(userInfo, "data"), let value = nested[key] { return value }
    return nil
  }

  static func dict(_ userInfo: [AnyHashable: Any], _ key: String) -> [AnyHashable: Any]? {
    if let value = userInfo[key] as? [AnyHashable: Any] { return value }
    if let raw = userInfo[key] as? String,
       let data = raw.data(using: .utf8),
       let parsed = try? JSONSerialization.jsonObject(with: data) as? [AnyHashable: Any] {
      return parsed
    }
    return nil
  }

  /// Objet imbriqué (ex. `negotiation`, `deploy`), éventuellement sérialisé en JSON.
  static func object(_ userInfo: [AnyHashable: Any], _ key: String) -> [AnyHashable: Any]? {
    guard let value = lookup(userInfo, key) else { return nil }
    if let value = value as? [AnyHashable: Any] { return value }
    if let raw = value as? String,
       let data = raw.data(using: .utf8),
       let parsed = try? JSONSerialization.jsonObject(with: data) as? [AnyHashable: Any] {
      return parsed
    }
    return nil
  }

  /// Tableau d'objets (ex. `proposals`), éventuellement sérialisé en JSON.
  static func objects(_ userInfo: [AnyHashable: Any], _ key: String) -> [[AnyHashable: Any]] {
    guard let value = lookup(userInfo, key) else { return [] }
    if let value = value as? [[AnyHashable: Any]] { return value }
    if let raw = value as? String,
       let data = raw.data(using: .utf8),
       let parsed = try? JSONSerialization.jsonObject(with: data) as? [[AnyHashable: Any]] {
      return parsed
    }
    return []
  }

  static func string(_ userInfo: [AnyHashable: Any], _ key: String) -> String? {
    guard let value = lookup(userInfo, key) else { return nil }
    return stringValue(value)
  }

  static func number(_ userInfo: [AnyHashable: Any], _ key: String) -> Double? {
    guard let value = lookup(userInfo, key) else { return nil }
    return numberValue(value)
  }

  static func stringValue(_ value: Any?) -> String? {
    if let value = value as? String, !value.isEmpty { return value }
    if let value = value as? NSNumber { return value.stringValue }
    return nil
  }

  static func numberValue(_ value: Any?) -> Double? {
    if let value = value as? Double { return value }
    if let value = value as? Int { return Double(value) }
    if let value = value as? NSNumber { return value.doubleValue }
    if let value = value as? String {
      return Double(value.replacingOccurrences(of: ",", with: "."))
    }
    return nil
  }

  static func eur(_ value: Double?, suffix: String = "") -> String {
    guard let value else { return "—" }
    let formatted = String(format: "%.2f", value).replacingOccurrences(of: ".", with: ",")
    return "\(formatted) €\(suffix)"
  }

  static func pct(_ value: Double) -> String {
    let formatted = String(format: "%.1f", value).replacingOccurrences(of: ".", with: ",")
    return "\(formatted) %"
  }

  /// « 12 nov. » à partir d'une date ISO 8601 ; `nil` si illisible.
  static func shortDate(_ iso: String?) -> String? {
    guard let iso else { return nil }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let date = formatter.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
    guard let date else { return nil }
    let out = DateFormatter()
    out.locale = Locale(identifier: "fr_FR")
    out.dateFormat = "d MMM"
    return out.string(from: date)
  }
}

extension Color {
  init(hex: UInt, opacity: Double = 1) {
    self.init(
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255,
      opacity: opacity
    )
  }
}
