/**
 * Generates an industry-level, dark luxury theme HTML email matching the Connect Club aesthetic.
 * Colors: Deep Obsidian (#0A0B14), Dark Card (#121324), Vivid Purple/Violet (#9333EA, #A855F7), Electric Glow.
 */
export function getOtpEmailHtml(otp: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect Club Verification Code</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .container-table {
        width: 100% !important;
        margin: 0 !important;
      }
      .content-padding {
        padding: 32px 20px !important;
      }
      .otp-code {
        font-size: 34px !important;
        letter-spacing: 8px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #05060A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Outer Wrapper Table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #05060A; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="container-table" style="max-width: 540px; background-color: #0D0E1A; border: 1px solid rgba(168, 85, 247, 0.22); border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(147, 51, 234, 0.15);">
          
          <!-- Top Accent Glow Bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #9333EA 0%, #C084FC 50%, #3B82F6 100%);"></td>
          </tr>

          <!-- Card Content Body -->
          <tr>
            <td class="content-padding" style="padding: 44px 40px 36px 40px; text-align: center;">
              
              <!-- Brand Badge / Logo -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; padding: 8px 18px; border-radius: 15px; background: rgba(147, 51, 234, 0.12); border: 1px solid rgba(168, 85, 247, 0.3);">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 14px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">
                            <span style="color: #FFFFFF;">CONNECT</span>
                            <span style="color: #A855F7; margin-left: 4px;">CLUB</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Main Title -->
              <h1 style="margin: 28px 0 10px 0; font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.03em; line-height: 1.25;">
                Verify Your Account
              </h1>
              <p style="margin: 0 auto; max-width: 420px; font-size: 15px; color: #9B98A3; line-height: 1.6;">
                Welcome to Connect Club! Enter the 6-digit verification code below to confirm your identity and complete registration.
              </p>

              <!-- OTP Code Display Card -->
              <div style="margin: 36px 0 28px 0;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: radial-gradient(circle at 50% 0%, rgba(147, 51, 234, 0.22) 0%, rgba(10, 11, 20, 0.8) 100%); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 14px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);">
                  <tr>
                    <td align="center" style="padding: 24px 16px;">
                      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #C084FC; margin-bottom: 8px;">
                        One-Time Passcode
                      </div>
                      <div class="otp-code" style="font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #FFFFFF; text-shadow: 0 0 20px rgba(168, 85, 247, 0.6); margin-left: 10px;">
                        ${otp}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Expiry Alert Pill -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 6px 14px; background-color: rgba(255, 255, 255, 0.04); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); font-size: 13px; color: #D1D5DB;">
                    ⏱️ Code expires in <strong style="color: #F3F4F6;">10 minutes</strong>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                <tr>
                  <td style="height: 1px; background-color: rgba(255, 255, 255, 0.08);"></td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="padding: 12px 16px; background-color: rgba(239, 68, 68, 0.08); border-left: 3px solid #EF4444; border-radius: 6px;">
                    <p style="margin: 0; font-size: 13px; color: #FCA5A5; line-height: 1.5;">
                      <strong>Security Tip:</strong> Never share this code with anyone. Connect Club team members will never ask for your verification code.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="padding: 24px 40px 32px 40px; background-color: #07080F; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6B7280;">
                If you didn't initiate this request, you can safely ignore this email.
              </p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #4B5563;">
                Vardhaman College of Engineering &bull; Connect Club
              </p>
              <p style="margin: 0; font-size: 11px;">
                <a href="https://connectclubvce.tech" style="color: #9333EA; text-decoration: none; font-weight: 600;">connectclubvce.tech</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
