import { jest } from '@jest/globals';
import dotenv from 'dotenv';

jest.mock('@libs/database');
jest.mock('@libs/stripe')

dotenv.config({ path: '.env.dev' });