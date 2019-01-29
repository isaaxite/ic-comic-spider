import sharp = require("sharp");

export = helperDto;
declare namespace helperDto {
  export function GetPicMetadataCb(err: Error | null, metadata?: sharp.Metadata): void;
}
