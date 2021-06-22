export function consoleInterceptor(req: any, res: any, next: any) {
  if (res) {
    console.log(`${req.originalUrl} :: ${req.method}`);
  }

  next();
}