declare module "form-data" {
  class FormData {
    append(key: string, value: any, options?: any): void;
    getHeaders(): Record<string, string>;
    getBuffer(): Buffer;
    getBoundary(): string;
    getLength(callback: (err: Error | null, length: number) => void): void;
    submit(url: string, callback: (err: Error | null, res: any) => void): void;
    pipe(destination: any): any;
  }

  export = FormData;
}
