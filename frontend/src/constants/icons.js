import {
  Calculator,
  BookMarked,
  FlaskConical,
  Globe,
  Code2,
  Music,
  Palette,
  Landmark,
  Dumbbell,
  Target,
} from "lucide-react";

export const ICON_LIBRARY = [
  { key: "calculator", Icon: Calculator },
  { key: "book", Icon: BookMarked },
  { key: "flask", Icon: FlaskConical },
  { key: "globe", Icon: Globe },
  { key: "code", Icon: Code2 },
  { key: "music", Icon: Music },
  { key: "palette", Icon: Palette },
  { key: "landmark", Icon: Landmark },
  { key: "dumbbell", Icon: Dumbbell },
  { key: "target", Icon: Target },
];

export const ICON_MAP = Object.fromEntries(
  ICON_LIBRARY.map((item) => [item.key, item.Icon])
);

export const COLOR_LIBRARY = [
  "#E1EFEE",
  "#FBEBD9",
  "#E4ECE8",
  "#F6E1E1",
  "#FDF1D9",
];
