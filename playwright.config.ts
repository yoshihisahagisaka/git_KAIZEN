import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'tests/browser',fullyParallel:false,workers:1,timeout:60000,
  use:{browserName:'chromium',headless:true,timezoneId:'UTC',trace:'retain-on-failure'},
  reporter:'list',
});
