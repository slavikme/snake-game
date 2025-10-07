# Database Setup

This project uses Drizzle ORM with PostgreSQL.

## Environment Variables

Create a `.env.local` file in the root directory with:

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

## Database Schema

### Users Table

- `id` - UUID (auto-generated, primary key)
- `name` - Text (unique, required)
- `created_at` - Timestamp (auto-generated)
- `updated_at` - Timestamp (auto-generated)

### Auth Table

- `token` - UUID (auto-generated, primary key)
- `user_id` - UUID (required, references users.id)
- `created_at` - Timestamp (auto-generated)

## Available Functions

### `getUserById(userId: string)`

Retrieves a user by their ID. Returns `null` if not found.

```typescript
import { getUserById } from "@/lib/db/queries";

const user = await getUserById("user-uuid");
// Returns: { id, name, createdAt, updatedAt } | null
```

### `getUserByAuthToken(token: string): Promise<User | null>`

Retrieves a user by their auth token. Returns only the user record, not the token. Returns `null` if not found.

```typescript
import { getUserByAuthToken } from "@/lib/db/queries";

const user = await getUserByAuthToken("token-uuid");
// Returns: { id, name, createdAt, updatedAt } | null
```

### `registerUser(name: string): Promise<Auth & { user: User }>`

Creates a new user and generates an auth token for them. Returns the complete auth record with the user data nested inside.

```typescript
import { registerUser } from "@/lib/db/queries";

const result = await registerUser("John Doe");
// Returns: { token, userId, createdAt, user: { id, name, createdAt, updatedAt } }
```

## Database Commands

```bash
# Generate migrations from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push schema directly to database (development)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Initial Setup

1. Set up your `DATABASE_URL` in `.env.local`
2. Run migrations: `npm run db:push` or `npm run db:migrate`
3. Start using the database functions in your code
