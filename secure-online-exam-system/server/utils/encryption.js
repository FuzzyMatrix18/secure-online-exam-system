import CryptoJS from "crypto-js";

export const encrypt = (data) =>
  CryptoJS.AES.encrypt(data, process.env.AES_SECRET).toString();

export const decrypt = (cipher) =>
  CryptoJS.AES.decrypt(cipher, process.env.AES_SECRET)
    .toString(CryptoJS.enc.Utf8);
