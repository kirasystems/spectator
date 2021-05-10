import { Annotation as dvAnnotation } from "document-viewer";

export type Annotation = dvAnnotation & { text: string };

export type Document = {
  id: number;
  name: string;
  pages: number;
  processed: boolean;
};

export type Topic = {
  id: number;
  topic: string;
};
