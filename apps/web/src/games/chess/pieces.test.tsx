import { CHESS_PIECE, type ChessPieceType } from "@board-games/games/chess";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChessPiece, pieceSrc } from "./pieces";
import { ChessSeatMark } from "./SeatMark";
import { played } from "./test-helpers";

const TYPES = Object.values(CHESS_PIECE) as readonly ChessPieceType[];

describe("chess pieces", () => {
  it.each(TYPES.flatMap((type) => (["w", "b"] as const).map((look) => [type, look] as const)))(
    "draws the %s of side %s with its staunty file, hidden from assistive technology",
    (type, look) => {
      const { container } = render(<ChessPiece type={type} look={look} />);

      const image = container.querySelector("img");
      expect(image).toHaveAttribute("src", `/pieces/staunty/${look}${type.toUpperCase()}.svg`);
      expect(image).toHaveAttribute("alt", "");
      expect(image).toHaveAttribute("aria-hidden", "true");
    },
  );

  it("names the files the way the set does", () => {
    expect(pieceSrc("b", "n")).toBe("/pieces/staunty/bN.svg");
  });

  it("draws a figurine as a silhouette in the colour of the text", () => {
    const { container } = render(<ChessPiece type="n" look="ink" />);

    const figurine = container.firstElementChild;
    expect(figurine).toHaveAttribute("aria-hidden", "true");
    expect(figurine).toHaveAttribute("data-piece-figurine", "n");
    expect(figurine?.getAttribute("class")).toContain("bg-current");
    expect(figurine?.getAttribute("class")).toContain("wN.svg");
  });

  it("marks a seat with the king of its side", () => {
    const { container } = render(<ChessSeatMark player={1} state={played()} />);

    expect(container.querySelector("img")).toHaveAttribute("src", "/pieces/staunty/bK.svg");
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
