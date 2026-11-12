const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'tests',testMatch:'*.spec.cjs',workers:1,timeout:30000,use:{baseURL:'http://127.0.0.1:8001',channel:'msedge',headless:true},webServer:{command:'npm start',url:'http://127.0.0.1:8001',reuseExistingServer:true,env:{PORT:'8001'}}});
