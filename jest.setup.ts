import { jest } from '@jest/globals';
import dotenv from 'dotenv';

jest.mock('@libs/database');
jest.mock('@libs/stripe');
jest.mock('wait');

dotenv.config({ path: '.env.test' });