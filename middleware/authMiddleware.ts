import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            return res.status(401).json({ message: "Authentication required" })
        }
        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        );
        (req as any).user = decoded;

        next();
    }
    catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
}
export const authorize = (...allowedRoles: ("owner" | "staff")[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user || !allowedRoles.includes(user.role)) {
            return res.status(403).json({
                message: "Access denied",
            });
        }

        next();
    };
};  