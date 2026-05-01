export const G = {
  "Brisket": {
    p:["Post Oak","Hickory","Competition Blend"],
    pn:"Post Oak = Texas classic, clean & earthy. Hickory = more punch. Competition Blend = reliable all-rounder.",
    pull:203, wrap:165, pit:225, stall:true, sr:"150–165°F", sd:"up to 7 hrs", co:10,
    stages:[
      {n:1, t:"180°F Super Smoke", w:"Cook start", d:"2–3 hrs", a:"Place fat-side up. Keep lid closed — build your smoke ring and initial bark."},
      {n:2, t:"225°F", w:"After smoke phase", d:"Until 165°F", a:"Low & slow. Stall hits at 150–165°F and can last 7 hrs. Don't open the lid."},
      {n:3, t:"225°F", w:"At 165°F", d:"Until 203°F", a:"Wrap in pink butcher paper (preserves bark) or foil (faster, softer bark). Return immediately."},
      {n:4, t:"165°F Keep Warm", w:"At 203°F", d:"1–2 hrs", a:"Rest wrapped in towels in a dry cooler. 1–2 hrs minimum — this step is not optional."}
    ],
    tip:"Probe should slide into the flat like warm butter with zero resistance. That feel matters more than hitting an exact number."
  },
  "Chuck Roast": {
    p:["Hickory","Oak","Mesquite"],
    pn:"Hickory = bold bark. Oak = more balanced. Mesquite is intense — use sparingly.",
    pull:205, wrap:165, pit:225, stall:true, sr:"155–165°F", sd:"2–4 hrs", co:8,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"Until 165°F", a:"Fat-side up. This cut handles heavy rubs well."},
      {n:2, t:"250°F", w:"At 165°F", d:"Until 205°F", a:"Wrap with a splash of beef broth. Raise temp to power through the stall."},
      {n:3, t:"Off", w:"At 205°F", d:"30–60 min", a:"Rest wrapped 30–60 min before pulling."}
    ],
    tip:"Pull apart at 205°F or slice at 195°F for firmer texture."
  },
  "Short Ribs": {
    p:["Oak","Hickory","Pecan"],
    pn:"Oak = classic for beef ribs. Hickory = punch. Pecan = nuttier finish.",
    pull:203, wrap:175, pit:250, stall:true, sr:"160–175°F", sd:"2–3 hrs", co:8,
    stages:[
      {n:1, t:"180°F Super Smoke", w:"Cook start", d:"1 hr", a:"Bone-side down. Build a deep smoke crust."},
      {n:2, t:"250°F", w:"After smoke", d:"Until 175°F", a:"Low & slow. Stall will hit — stay patient, don't spray often."},
      {n:3, t:"250°F", w:"At 175°F (optional)", d:"Until 203°F", a:"Wrap in butcher paper for juicier ribs. Skip for harder bark."},
      {n:4, t:"Off", w:"At 203°F", d:"30–45 min", a:"Rest 30–45 min loosely tented."}
    ],
    tip:"Zero probe resistance between the bones means done. Bone will also visibly start pulling back."
  },
  "Prime Rib": {
    p:["Oak","Cherry","Hickory"],
    pn:"Oak = classic for beef. Cherry adds beautiful mahogany color. Light hickory complements well.",
    pull:130, pit:225, stall:false, co:13,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"Until 118–122°F", a:"Bone-side down (bones act as a natural rack). Smoke until 10–12°F below target."},
      {n:2, t:"Max (450°F+)", w:"At 118–122°F", d:"10–15 min", a:"Reverse sear: raise Traeger to max or use cast iron. Rotate every 2 min."},
      {n:3, t:"Off", w:"At 128–130°F", d:"15–20 min", a:"Rest loosely tented. Carryover brings it to 130–135°F (medium rare)."}
    ],
    tip:"Pull 12°F early — carryover adds 10–15°F through the sear and rest. Don't slice until fully rested."
  },
  "Tri-Tip": {
    p:["Oak","Cherry","Competition Blend"],
    pn:"Oak = traditional Santa Maria style. Cherry adds sweetness and color.",
    pull:130, pit:225, stall:false, co:7,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"Until 115–120°F", a:"Fat-side up. Smoke until 10°F below your target."},
      {n:2, t:"450°F", w:"At 115–120°F", d:"8–12 min", a:"Raise to max temp. Sear 3–4 min per side until 130–135°F."},
      {n:3, t:"Off", w:"At 130–135°F", d:"5–10 min", a:"Rest 5–10 min. Slice AGAINST the grain — it changes direction in this cut."}
    ],
    tip:"The grain runs in two directions from the center. Find the seam and slice perpendicular on each half."
  },
  "Back Ribs": {
    p:["Hickory","Oak","Mesquite"],
    pn:"Hickory is the natural pairing for beef ribs — bold and strong.",
    pull:203, wrap:170, pit:225, stall:true, sr:"155–170°F", sd:"1–3 hrs", co:5,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"3 hrs", a:"Bone-side down. Remove silver skin. Season generously."},
      {n:2, t:"225°F", w:"After 3 hrs", d:"2 hrs wrapped", a:"Wrap with butter, honey, and a splash of beef broth."},
      {n:3, t:"250°F", w:"After 2 hrs wrapped", d:"30–60 min", a:"Unwrap, sauce if desired. Finish until probe goes in clean."}
    ],
    tip:"Toothpick test between bones — clean push-through means done."
  },
  "Shoulder / Butt": {
    p:["Apple","Cherry","Pecan","Competition Blend"],
    pn:"Fruit woods keep pork sweet. Pecan = nuttier and bolder. Competition Blend = reliable all-rounder.",
    pull:205, wrap:165, pit:250, stall:true, sr:"160–170°F", sd:"2–5 hrs", co:8,
    stages:[
      {n:1, t:"180°F Super Smoke", w:"Cook start", d:"2 hrs", a:"Fat-side up. Low temp lets fat and collagen start breaking down slowly."},
      {n:2, t:"250°F", w:"After smoke", d:"Until 165°F", a:"Raise temp and cook. Stall hits at 160–170°F — your RFX graph will show the plateau."},
      {n:3, t:"250°F", w:"At 165°F", d:"Until 205°F", a:"Wrap with a splash of apple juice or cider vinegar. Powers through stall, adds moisture."},
      {n:4, t:"165°F Keep Warm", w:"At 205°F", d:"30–60 min+", a:"Rest wrapped before pulling. Longer rest = better result."}
    ],
    tip:"For pulled pork: 205°F + zero probe resistance. For sliceable pork: pull at 190–195°F."
  },
  "Baby Back Ribs": {
    p:["Apple","Cherry","Hickory"],
    pn:"Apple and cherry = classic pork pairing, sweet and mild. Hickory adds depth.",
    pull:200, pit:225, stall:false, co:3,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"3 hrs", a:"Bone-side down. Remove silver skin. Apply rub 30 min before. No wrap yet."},
      {n:2, t:"225°F", w:"After 3 hrs", d:"2 hrs wrapped", a:"Wrap each rack with butter, brown sugar, honey, and a splash of apple juice."},
      {n:3, t:"225°F", w:"After 2 hrs wrapped", d:"45–60 min", a:"Unwrap, glaze with sauce if desired. Finish until bend test confirms done."}
    ],
    tip:"Bend test: tongs in the middle — if the rack bends 90° and bark cracks, it's done. Probe between bones for 195–203°F."
  },
  "St. Louis Ribs": {
    p:["Hickory","Apple","Cherry"],
    pn:"Hickory = bolder, smokier bark. Apple or cherry keeps them sweet.",
    pull:203, pit:225, stall:false, co:3,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"3 hrs", a:"Bone-side down. Trim flap meat. Season both sides generously."},
      {n:2, t:"225°F", w:"After 3 hrs", d:"2 hrs wrapped", a:"Wrap in foil with butter, apple juice, brown sugar, and honey."},
      {n:3, t:"275°F", w:"After 2 hrs wrapped", d:"1 hr", a:"Unwrap, raise temp slightly. Sauce if desired. Finish until tender."}
    ],
    tip:"St. Louis ribs are flatter and fattier than baby backs — more forgiving. Heavy rub application works well."
  },
  "Tenderloin": {
    p:["Apple","Maple","Pecan"],
    pn:"Use mild woods only — pork tenderloin over-smokes easily. Apple or maple are ideal.",
    pull:145, pit:225, stall:false, co:5,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"1–2 hrs", a:"Smoke until 130–135°F internal. Tenderloin is lean and cooks fast."},
      {n:2, t:"450°F", w:"At 130–135°F", d:"3–5 min", a:"Raise to max and sear quickly, rotating every minute until 145°F."},
      {n:3, t:"Off", w:"At 145°F", d:"5 min", a:"Rest 5 min tented. Slice into medallions on the diagonal."}
    ],
    tip:"Lean cuts dry out fast. Pull exactly at 145°F. Set your RFX alert at 140°F so you're watching the final rise closely."
  },
  "Whole Chicken": {
    p:["Cherry","Apple","Pecan"],
    pn:"Cherry = beautiful mahogany color. Apple = mild & sweet. Pecan = a notch bolder.",
    pull:165, pit:275, stall:false, co:5,
    stages:[
      {n:1, t:"275°F", w:"Cook start", d:"Until 145°F breast", a:"Breast-side up. Skip Super Smoke — too much low smoke makes poultry skin rubbery."},
      {n:2, t:"375°F", w:"At 145°F breast", d:"Until 165°F breast", a:"Raise temp to crisp skin. This phase goes fast — watch it."},
      {n:3, t:"Off", w:"At 165°F breast", d:"5–10 min", a:"Rest 5–10 min. Verify thigh reads 175°F before carving."}
    ],
    tip:"Use two RFX probes — one in the breast (165°F), one in the thigh (175°F). They cook at different rates."
  },
  "Spatchcock Chicken": {
    p:["Cherry","Apple"],
    pn:"Fruit woods pair naturally with poultry. Cherry adds color; apple keeps it light.",
    pull:165, pit:375, stall:false, co:5,
    stages:[
      {n:1, t:"375°F", w:"Cook start", d:"Until 165°F breast", a:"Backbone removed, flattened, breast-side up. Single high temp gives crispy skin throughout."},
      {n:2, t:"Off", w:"At 165°F", d:"10 min", a:"Rest 10 min. Verify thigh at 175°F."}
    ],
    tip:"Pat skin completely dry before cooking. Rub butter under the skin for max crispness."
  },
  "Turkey": {
    p:["Apple","Pecan","Competition Blend"],
    pn:"Apple and pecan = classic Thanksgiving pairing. Avoid hickory or mesquite — too strong.",
    pull:165, pit:300, stall:false, co:8,
    stages:[
      {n:1, t:"225°F", w:"After 12–24 hr brine", d:"1–2 hrs", a:"Low and slow for smoke flavor penetration."},
      {n:2, t:"325°F", w:"After smoke phase", d:"Until 165°F breast", a:"Raise temp to finish safely and get through the danger zone."},
      {n:3, t:"Off", w:"At 165°F", d:"20–30 min", a:"Rest 20–30 min tented. Verify thigh at 175°F."}
    ],
    tip:"Stick to 10–14 lb birds. Larger turkeys spend too long in the danger zone. Wet brine is insurance against drying out."
  },
  "Thighs / Legs": {
    p:["Cherry","Apple","Pecan"],
    pn:"Cherry = great color. Apple = mild. Any fruit/nut wood pairs well.",
    pull:175, pit:275, stall:false, co:5,
    stages:[
      {n:1, t:"275°F", w:"Cook start", d:"Until 165°F", a:"Skin-side up. Dark meat is more forgiving — higher pull temp renders fat."},
      {n:2, t:"375°F", w:"At 165°F", d:"Until 175°F", a:"Raise temp to crisp skin in the final stretch."}
    ],
    tip:"Don't pull at 165°F — thighs are better at 175–180°F where fat fully renders and connective tissue breaks down."
  },
  "Salmon": {
    p:["Alder","Apple","Cherry"],
    pn:"Alder = traditional salmon wood, clean & mild. Apple = hint of sweetness. Avoid strong woods entirely.",
    pull:140, pit:180, stall:false, co:3,
    stages:[
      {n:1, t:"180°F Super Smoke", w:"After 2–4 hr dry brine", d:"30–45 min", a:"Skin-side down on cedar plank or foil. Low temp builds smoke without drying."},
      {n:2, t:"225°F", w:"After smoke phase", d:"Until 140°F", a:"Raise temp slightly to finish. Watch closely — salmon overcooks fast."}
    ],
    tip:"Dry brine: salt + brown sugar + dill on flesh side, uncovered in fridge 2–4 hrs. Forms a pellicle that helps smoke adhere."
  },
  "Trout": {
    p:["Alder","Apple"],
    pn:"Alder = ideal for all freshwater fish, clean & mild. Light apple complements without overpowering.",
    pull:145, pit:200, stall:false, co:3,
    stages:[
      {n:1, t:"200°F", w:"Cook start", d:"Until 145°F", a:"Whole trout, cleaned, seasoned inside cavity. Cedar plank or foil prevents sticking."}
    ],
    tip:"Done when flesh flakes at the thickest point. Set your RFX alert at 135°F to watch the final rise closely."
  }
};