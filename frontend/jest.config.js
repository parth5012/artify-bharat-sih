/** @type {import('jest').Config} */
const config={
 preset:'ts-jest',
 testEnvironment:'node',
 roots:['<rootDir>/tests'],
 testTimeout:15000,
 clearMocks:true,
 moduleNameMapper:{
  '^@/(.*)$':'<rootDir>/$1',
 },
};
module.exports=config;
