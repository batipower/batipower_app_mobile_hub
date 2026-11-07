/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'notification-content',
  deploymentTarget: '15.0',
  frameworks: ['SwiftUI', 'UserNotifications', 'UserNotificationsUI'],
  images: {
    hubLogo: '../../assets/logo-batipower.png',
  },
};
