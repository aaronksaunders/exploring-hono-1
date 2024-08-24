import { Hono, Context } from "hono";
import bcrypt from "bcryptjs";
import { decode, sign, verify } from "hono/jwt";

const SECRET_KEY = "your-secret-key"; // Change this to a secure key
// Define types for the user and JWT payload
interface User {
  email: string;
  passwordHash: string;
}

interface JwtPayload {
  email: string;
}
// Mock user data, replace with your database or user management
const users: User[] = [
  {
    email: "test@example.com",
    passwordHash: bcrypt.hashSync("password123", 10), // Example hashed password
  },
];
// Middleware to verify JWT
const authenticate = async (c: Context, next: () => Promise<void>) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ message: "No token provided" }, 401);

  try {
    const decoded = await verify(token, SECRET_KEY);
    (c as any).user = decoded as any;
    await next();
  } catch (err) {
    return c.json({ message: "Invalid token" }, 401);
  }
};

// Login route
const auth = new Hono()
  .post("/login", async (c: Context) => {
    const { email, password } = await c.req.json();

    const user = users.find((u) => u.email === email);
    if (user && bcrypt.compareSync(password, user.passwordHash)) {
      const token = await sign(
        {
          email: user.email,
          exp: Math.floor(Date.now() / 1000) + 60 * 5, // Token expires in 5 minutes
        },
        SECRET_KEY
      );
      return c.json({ token });
    } else {
      return c.json({ message: "Invalid email or password" }, 401);
    }
  })

  // Logout route (optional)
  .post("/logout", async (c: Context) => {
    // Handle logout logic here if needed
    return c.json({ message: "Logged out" });
  })

  // Protected route
  .get("/protected", authenticate, async (c: Context) => {
    console.log(c);
    return c.json({
      message: "This is protected content",
      user: (c as any).user,
    });
  });

export default auth;
