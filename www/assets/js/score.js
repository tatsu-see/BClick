document.addEventListener("DOMContentLoaded", () => {
  if (!window.Vex) return;

  const container = document.getElementById("score");
  if (!container) return;

  const VF = window.Vex.Flow;
  const width = container.clientWidth || 520;
  const height = 140;
  const padding = 10;
  const staveWidth = Math.floor((width - padding * 2) / 2);

  const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
  renderer.resize(width, height);

  const context = renderer.getContext();
  context.setFont("Arial", 10, "");

  const firstStave = new VF.Stave(padding, 20, staveWidth);
  firstStave.addClef("treble").addTimeSignature("4/4");
  firstStave.setContext(context).draw();

  const secondStave = new VF.Stave(padding + staveWidth, 20, staveWidth);
  secondStave.setEndBarType(VF.Barline.type.END);
  secondStave.setContext(context).draw();

  const makeQuarterNotes = () => ([
    new VF.StaveNote({ keys: ["c/4"], duration: "q" }),
    new VF.StaveNote({ keys: ["d/4"], duration: "q" }),
    new VF.StaveNote({ keys: ["e/4"], duration: "q" }),
    new VF.StaveNote({ keys: ["f/4"], duration: "q" }),
  ]);

  const voice1 = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(makeQuarterNotes());
  const voice2 = new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(makeQuarterNotes());

  new VF.Formatter().joinVoices([voice1]).formatToStave([voice1], firstStave);
  voice1.draw(context, firstStave);

  new VF.Formatter().joinVoices([voice2]).formatToStave([voice2], secondStave);
  voice2.draw(context, secondStave);
});
