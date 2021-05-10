export type Annotation = {
  characterStart: number;
  characterEnd: number;
  pageStart: number;
  pageEnd: number;
  top: number;
  left: number;
  topic: string;
};

export type IndexedAnnotation = Annotation & { _index: number };

export type BoundingBox = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

export type Token = {
  line: number;
  boundingBox: BoundingBox;
  characterStart: number;
  characterEnd: number;
};

export type MousePosition = [number, number] | null; // [x, y] | null
export type ScrollPosition = [number, number]; // [x, y] | null

export type MouseSelection = [[number, number], [number, number]] | null;

export type Selection = {
  index: number;
  page: number;
  token: Token;
} | null;

export type PageSelection = { indexStart: number; indexEnd: number } | null;

export type ImageURL = string | (() => Promise<string>);
export type TokensURL = string | (() => Promise<Token[]>);

export type Page = {
  originalHeight: number;
  originalWidth: number;
  imageURL: ImageURL;
  tokensURL: TokensURL;
};

export type Topic = string;

export type SearchResult = {
  characterStart: number;
  characterEnd: number;
  pageStart: number;
  pageEnd: number;
  top: number;
  left: number;
};