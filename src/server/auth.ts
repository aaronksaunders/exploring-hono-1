import { Hono, Context } from "hono";
import bcrypt from "bcryptjs";
import { decode, sign, verify } from "hono/jwt";
import prisma from "./prisma-client";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { JWTPayload } from "hono/utils/jwt/types";

const SECRET_KEY = "your-secret-key"; // Change this to a secure key
// Define types for the user and JWT payload
interface User {
  email: string;
  passwordHash: string;
}

interface JwtPayload {
  email: string;
  exp: number;
  role: string;
}

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

const auth = new Hono()
  //////////////////////////////////////////////
  // REGISTER ADMIN
  //////////////////////////////////////////////
  .post(
    "/register-admin",
    zValidator(
      "json",
      z.object({
        email: z.string(),
        password: z.string(),
        firstName: z.string(),
        lastName: z.string(),
      })
    ),
    async (c) => {
      // confirm that the user is an admin
      const requestingUser = (c as any).user as JwtPayload;
      const currentUser = await prisma.user.findUnique({
        where: { email: requestingUser.email },
        include: { role: true },
      });

      if (!currentUser) {
        return c.json({ message: "User not found" }, 404);
      }

      if (currentUser.role.name !== "ADMIN") {
        return c.json({ message: "User is not an admin" }, 403);
      }

      const { email, password, firstName, lastName } = c.req.valid("json");

      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        return c.json({ message: "User already exists" }, 400);
      }

      const adminRole = await prisma.role.findFirst({
        where: { name: "ADMIN" },
      });

      if (!adminRole) {
        return c.json({ message: "Admin Role not found" }, 400);
      }

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: bcrypt.hashSync(password, 10),
          firstName,
          lastName,
          role: {
            connect: {
              id: adminRole?.id,
            },
          },
        },
      });

      const returnedUser = { ...user, passwordHash: undefined };
      return c.json({ message: "User created", user: returnedUser }, 201);
    }
  )
  //////////////////////////////////////////////
  // REGISTER USER
  //////////////////////////////////////////////
  .post(
    "/register",
    zValidator(
      "json",
      z.object({
        email: z.string(),
        password: z.string(),
        firstName: z.string(),
        lastName: z.string(),
      })
    ),
    async (c) => {
      const { email, password, firstName, lastName } = c.req.valid("json");

      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        return c.json({ message: "User already exists" }, 400);
      }

      const userRole = await prisma.role.findFirst({
        where: { name: "USER" },
      });

      if (!userRole) {
        return c.json({ message: "User Role not found" }, 400);
      }

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: bcrypt.hashSync(password, 10),
          firstName,
          lastName,
          role: {
            connect: {
              id: userRole?.id,
            },
          },
        },
      });

      const returnedUser = { ...user, passwordHash: undefined };
      return c.json({ message: "User created", user: returnedUser }, 201);
    }
  )
  //////////////////////////////////////////////
  // LOGIN USER
  //////////////////////////////////////////////
  .post(
    "/login",
    zValidator(
      "json",
      z.object({
        email: z.string(),
        password: z.string(),
      })
    ),
    async (c) => {
      const { email, password } = c.req.valid("json");

      const user = await prisma.user.findUnique({
        where: { email },
        include: { role: true },
      });

      if (user && bcrypt.compareSync(password, user.passwordHash)) {
        const token = await sign(
          {
            email: user.email,
            role: user.role.name,
            exp: Math.floor(Date.now() / 1000) + 60 * 5, // Token expires in 5 minutes
          },
          SECRET_KEY
        );
        return c.json({ token, id: user.id }, 200);
      } else {
        return c.json({ message: "Invalid email or password" }, 401);
      }
    }
  )
  //////////////////////////////////////////////
  // Logout route (optional)
  //////////////////////////////////////////////
  .post("/logout", async (c: Context) => {
    // Handle logout logic here if needed
    return c.json({ message: "Logged out" });
  })
  //////////////////////////////////////////////
  // Protected route
  //////////////////////////////////////////////
  .get("/protected", authenticate, async (c: Context) => {
    console.log(c);
    return c.json({
      message: "This is protected content",
      user: (c as any).user,
    });
  })
  //////////////////////////////////////////////
  // Decode JWT
  //////////////////////////////////////////////
  .post("/decode", async (c: Context) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return c.json({ message: "No token provided" }, 401);

    try {
      const decoded = await decode(token);
      return c.json({ message: "Token decoded", decoded }, 200);
    } catch (err) {
      return c.json({ message: "Invalid token" }, 401);
    }
  })
  //////////////////////////////////////////////
  // Verify JWT
  //////////////////////////////////////////////
  .post("/verify", async (c: Context) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return c.json({ message: "No token provided" }, 401);

    try {
      const decoded = await verify(token, SECRET_KEY);
      return c.json({ message: "Token verified", decoded }, 200);
    } catch (err) {
      return c.json({ message: "Invalid token" }, 401);
    }
  })
  //////////////////////////////////////////////
  // Refresh JWT
  //////////////////////////////////////////////
  .post("/refresh", async (c: Context) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return c.json({ message: "No token provided" }, 401);

    try {
      const decoded = await verify(token, SECRET_KEY);
      const newToken = await sign(
        {
          email: (decoded as JWTPayload).email,
          exp: Math.floor(Date.now() / 1000) + 60 * 5, // Token expires in 5 minutes
        },
        SECRET_KEY
      );
      return c.json({ message: "Token refreshed", token: newToken }, 200);
    } catch (err) {
      return c.json({ message: "Invalid token" }, 401);
    }
  })
  //////////////////////////////////////////////
  // Delete user (optional)
  //////////////////////////////////////////////
  .delete("/delete", authenticate, async (c: Context) => {
    const user = (c as any).user as JwtPayload;
    await prisma.user.delete({ where: { email: user.email } });
    return c.json({ message: "User deleted" }, 200);
  })
  //////////////////////////////////////////////
  // Update user (optional)
  //////////////////////////////////////////////
  .put(
    "/update",
    authenticate,
    zValidator(
      "json",
      z.object({
        email: z.string(),
        password: z.string(),
        firstName: z.string(),
        lastName: z.string(),
      })
    ),
    async (c) => {
      const user = (c as any).user as JwtPayload;
      const { email, password, firstName, lastName } = c.req.valid("json");

      await prisma.user.update({
        where: { email: user.email },
        data: {
          email,
          passwordHash: bcrypt.hashSync(password, 10),
          firstName,
          lastName,
        },
      });

      return c.json({ message: "User updated" }, 200);
    }
  )
  //////////////////////////////////////////////
  // Get all users (optional)
  //////////////////////////////////////////////
  .get("/users", authenticate, async (c: Context) => {
    const users = await prisma.user.findMany();
    return c.json({ users }, 200);
  })
  //////////////////////////////////////////////
  // Get Current User
  //////////////////////////////////////////////
  .get("/me", authenticate, async (c: Context) => {
    const user = (c as any).user as JwtPayload;
    const currentUser = await prisma.user.findUnique({
      where: { email: user.email },
    });
    const returnedUser = { ...currentUser, passwordHash: undefined };
    return c.json({ user: returnedUser }, 200);
  });

export default auth;
