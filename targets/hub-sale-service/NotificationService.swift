import UserNotifications

final class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttemptContent: UNMutableNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    guard let bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent else {
      contentHandler(request.content)
      return
    }
    self.bestAttemptContent = bestAttemptContent

    guard let imageURL = Self.imageURL(from: request.content.userInfo) else {
      contentHandler(bestAttemptContent)
      return
    }

    Self.downloadAttachment(from: imageURL) { attachment in
      if let attachment {
        bestAttemptContent.attachments = [attachment]
      }
      contentHandler(bestAttemptContent)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    if let contentHandler, let bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }

  private static func imageURL(from userInfo: [AnyHashable: Any]) -> URL? {
    let raw = string(userInfo, "image") ?? string(userInfo, "thumbnail")
    guard let raw, let url = URL(string: raw), url.scheme == "https" else {
      return nil
    }
    return url
  }

  private static func string(_ userInfo: [AnyHashable: Any], _ key: String) -> String? {
    if let value = userInfo[key] as? String, !value.isEmpty { return value }
    if let body = userInfo["body"] as? [AnyHashable: Any],
       let value = body[key] as? String, !value.isEmpty {
      return value
    }
    if let data = userInfo["data"] as? [AnyHashable: Any],
       let value = data[key] as? String, !value.isEmpty {
      return value
    }
    if let raw = userInfo["body"] as? String,
       let parsed = parseJSON(raw)?[key] as? String, !parsed.isEmpty {
      return parsed
    }
    return nil
  }

  private static func parseJSON(_ raw: String) -> [AnyHashable: Any]? {
    guard let data = raw.data(using: .utf8) else { return nil }
    return try? JSONSerialization.jsonObject(with: data) as? [AnyHashable: Any]
  }

  private static func downloadAttachment(
    from url: URL,
    completion: @escaping (UNNotificationAttachment?) -> Void
  ) {
    let task = URLSession.shared.downloadTask(with: url) { localURL, _, _ in
      guard let localURL else {
        completion(nil)
        return
      }

      let dest = FileManager.default.temporaryDirectory
        .appendingPathComponent("sale-card-\(UUID().uuidString).png")
      try? FileManager.default.removeItem(at: dest)
      do {
        try FileManager.default.moveItem(at: localURL, to: dest)
        let attachment = try UNNotificationAttachment(
          identifier: "sale-card",
          url: dest,
          options: [UNNotificationAttachmentOptionsTypeHintKey: "public.png"]
        )
        completion(attachment)
      } catch {
        completion(nil)
      }
    }
    task.resume()
  }
}
