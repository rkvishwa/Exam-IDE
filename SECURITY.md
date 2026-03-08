# 🔒 Security Policy

## Supported Versions

Currently, only the latest release of Sonar Code Editor receives security updates.

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |
| < 1.0   | ❌        |

## 🛡️ IDE Security Restrictions

Because Sonar Code Editor is used for **Monitored Exams**:
- The **Preview Panel** is explicitly restricted to `localhost` to prevent external information gathering during an exam.
- User machine filesystem access is heavily sanded-boxed via `preload.ts` context bridges. 

## 👁️ Required Permissions & Privacy

To function as a monitored evaluation environment, the application requires and utilizes the following permissions:
- **Local & Outbound Network Access**: Required for Appwrite authentication and real-time WebSocket collaboration (Yjs).
- **Activity Monitoring**: The IDE automatically tracks window focus states (e.g., leaving the IDE during an exam), keyboard activity metrics, and internal application navigation. This data is logged and accessible to authorized Administrators via the Admin Panel or PDF reports.
- **Local Storage API**: Used heavily to store offline logs in the event of an internet disconnection so no exam metrics are lost.

## Reporting a Vulnerability

If you discover a security vulnerability within Sonar Code Editor, please **do not** open a public issue. 

Instead, please send an e-mail to the maintainers at `hello@brainvave.com`.
We will review your disclosure and respond as soon as possible, outlining the next steps for patching and a timeline for a coordinated release.