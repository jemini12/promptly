# Admin Console

## Access control

Admin access is enforced server-side.

- Primary control: `User.role === "admin"` in the database.
- Bootstrap / emergency access: `ADMIN_EMAILS` environment variable (comma-separated emails).

If `ADMIN_EMAILS` includes your account email, signing in will set your role to `admin`.

## Routes

- `/admin`
- `/admin/users`
- `/admin/users/:id`

## API

- `GET /api/admin/users` (admin-only)
- `PATCH /api/admin/users/:id` (admin-only)
