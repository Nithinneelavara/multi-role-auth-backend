import passport from 'passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import Admin from '../models/db/admin';
import Member from '../models/db/member';
import User from '../models/db/user';
import AccessToken from '../models/db/accessToken'; 

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

function createBearerStrategy(userType: 'admin' | 'member' | 'user', model: any, strategyName?: string) {
  passport.use(
    strategyName || userType,
    new BearerStrategy(async (token, done) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

        const stored = await AccessToken.findOne({ token, userType });
        if (!stored) return done(null, false); 

        const user = await model.findById(decoded.id);
        if (!user) return done(null, false);

        return done(null, user); 
      } catch (err) {
        return done(null, false);
      }
    })
  );
}

createBearerStrategy('admin', Admin); 
createBearerStrategy('member', Member, 'member-bearer');
createBearerStrategy('user', User, 'user-bearer');

export default passport;
