import { admins } from './index';
import Admin from '../models/db/admin';
import bcrypt from 'bcryptjs';

export const seedAdminUser = async () => {
  console.log('Seeding admins...');
  try {
    for (const adminData of admins) {
      const existingAdmin = await Admin.findOne({ email: adminData.email });

      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminData.password, 10);
        await Admin.create({ ...adminData, password: hashedPassword });
        console.log(`Admin ${adminData.email} seeded.`);
      } else {
        console.log(`Admin ${adminData.email} already exists.`);
      }
    }
  } catch (err) {
    console.error('Seeding failed:', err);
  }
};