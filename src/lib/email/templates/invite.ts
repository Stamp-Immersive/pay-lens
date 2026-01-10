export function getInviteEmailHtml({
  organizationName,
  inviterName,
  role,
  acceptUrl,
  isNewUser,
}: {
  organizationName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  isNewUser: boolean;
}) {
  const actionText = isNewUser ? 'Sign up to accept' : 'Accept invitation';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 32px; text-align: center;">
    <h1 style="color: #111; font-size: 24px; margin-bottom: 16px;">
      You're invited to join ${organizationName}
    </h1>

    <p style="color: #666; font-size: 16px; margin-bottom: 24px;">
      ${inviterName} has invited you to join <strong>${organizationName}</strong> as ${role === 'admin' ? 'an admin' : 'an employee'} on PayLens.
    </p>

    <a href="${acceptUrl}"
       style="display: inline-block; background: #000; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 16px;">
      ${actionText}
    </a>

    <p style="color: #999; font-size: 14px; margin-top: 24px;">
      ${isNewUser
        ? 'Click the button above to create your account and join the organization.'
        : 'Click the button above to view and accept this invitation.'}
    </p>
  </div>

  <div style="text-align: center; margin-top: 24px;">
    <p style="color: #999; font-size: 12px;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
    <p style="color: #999; font-size: 12px;">
      PayLens - Payroll Management
    </p>
  </div>
</body>
</html>
  `.trim();
}
