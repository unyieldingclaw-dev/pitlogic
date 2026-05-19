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
      {n:2, t:"250°F", w:"After smoke", d:"Until 165°F", a:"Raise temp and cook. Stall hits at 160–170°F — your PitLogic graph will show the plateau."},
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
    tip:"Lean cuts dry out fast. Pull exactly at 145°F. Set your PitLogic alert at 140°F so you're watching the final rise closely."
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
    tip:"Use two probes — one in the breast (165°F), one in the thigh (175°F). They cook at different rates."
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
    tip:"Done when flesh flakes at the thickest point. Set your PitLogic alert at 135°F to watch the final rise closely."
  },
  "Plate Ribs": {
    p:["Oak","Hickory","Pecan"],
    pn:"Oak = the classic for massive beef ribs, clean and strong. Hickory adds bold smoke. Pecan gives a nuttier finish.",
    pull:203, wrap:175, pit:275, stall:true, sr:"160–175°F", sd:"2–4 hrs", co:8,
    stages:[
      {n:1, t:"275°F", w:"Cook start", d:"1–2 hrs", a:"Bone-side down. Season generously — these are huge. Build a deep smoke crust."},
      {n:2, t:"275°F", w:"After smoke phase", d:"Until 175°F", a:"Stay patient through the stall. Don't spray — the fat cap bastes them continuously."},
      {n:3, t:"275°F", w:"At 175°F", d:"Until 203°F", a:"Wrap in butcher paper — no added liquid needed, the fat handles moisture."},
      {n:4, t:"Off", w:"At 203°F", d:"45–60 min", a:"Rest fully wrapped. Bone will visibly pull back before the probe confirms done."}
    ],
    tip:"Probe should slide between the bone and meat with zero resistance. 275°F pit temp is intentionally hotter than brisket — these thick bones need more heat to break down collagen."
  },
  "Beef Cheeks": {
    p:["Oak","Post Oak","Hickory"],
    pn:"Post Oak or Oak = clean, Texas-style. Hickory = more punch but don't overdo it — the fat in cheeks carries a lot of flavor already.",
    pull:210, wrap:170, pit:250, stall:true, sr:"160–175°F", sd:"2–4 hrs", co:8,
    stages:[
      {n:1, t:"250°F", w:"Cook start", d:"Until 170°F", a:"Silver skin side down, fat side up. Dense cut — build your bark patiently."},
      {n:2, t:"250°F", w:"At 170°F", d:"Until 210°F", a:"Wrap tight in foil with a splash of beef broth. Higher pull temp = full collagen breakdown = silky texture."},
      {n:3, t:"Off", w:"At 210°F", d:"1–2 hrs", a:"Rest 1–2 hrs. Two hours gives noticeably better results — they continue to loosen during the rest."}
    ],
    tip:"Done when they feel like gel under pressure. Probe resistance disappears entirely around 205–210°F. These are extremely forgiving — letting them rest longer only helps."
  },
  "Picanha": {
    p:["Oak","Cherry","Pecan"],
    pn:"Oak = traditional Brazilian style. Cherry adds sweetness and a beautiful crust color. Pecan for a nuttier finish.",
    pull:130, pit:225, stall:false, co:7,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"Until 110–115°F", a:"Fat-cap up. Score the fat cap in a cross-hatch pattern — deep cuts, don't go through to the meat. Smoke until 10°F below target."},
      {n:2, t:"450°F", w:"At 110–115°F", d:"8–10 min", a:"Sear fat-cap down first (2–3 min) to deeply caramelize it, then each side. The fat cap is the feature — render it hard."},
      {n:3, t:"Off", w:"At 128–130°F", d:"10 min", a:"Rest 10 min fat-cap up. Slice against the grain into thick steaks."}
    ],
    tip:"The grain runs toward the fat cap — slice perpendicular to it. Rest with fat-cap up so rendered fat drips back through the meat."
  },
  "Spare Ribs": {
    p:["Hickory","Apple","Cherry","Mesquite"],
    pn:"Hickory = bold bark. Apple or cherry keeps them sweet. Mesquite is aggressive — use sparingly if at all.",
    pull:203, pit:225, stall:false, co:3,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"3 hrs", a:"Bone-side down. Trim the skirt and sternum if not already done. More fat and meat than baby backs — season generously on both sides."},
      {n:2, t:"225°F", w:"After 3 hrs", d:"2 hrs wrapped", a:"Wrap in foil with butter, brown sugar, honey, and apple juice. More aggressive than baby backs — they can handle it."},
      {n:3, t:"275°F", w:"After 2 hrs wrapped", d:"45–60 min", a:"Unwrap, raise temp, sauce if desired. Needs more finish time than baby backs."}
    ],
    tip:"Bite test: meat should pull cleanly from the bone with one gentle bite, not fall off. Spare ribs are more forgiving than baby backs — more fat means more margin for error."
  },
  "Pork Belly": {
    p:["Apple","Maple","Cherry","Hickory"],
    pn:"Apple or maple = sweet and mild, lets the pork shine. Cherry = color and depth. Light hickory for more smoke punch.",
    pull:200, pit:250, stall:true, sr:"160–170°F", sd:"1–3 hrs", co:5,
    stages:[
      {n:1, t:"180°F Super Smoke", w:"Cook start", d:"2 hrs", a:"Skin-side up (or skin-off for burnt ends). Low temp builds color and initial bark slowly."},
      {n:2, t:"250°F", w:"After smoke phase", d:"Until 165°F", a:"Raise temp. Fat will visibly start rendering — you'll see it in the color change and sheen."},
      {n:3, t:"250°F", w:"At 165°F", d:"Until 200°F", a:"Wrap with a splash of apple cider. Powers through the stall, keeps moisture."},
      {n:4, t:"Off", w:"At 200°F", d:"30 min", a:"Rest 30 min. For burnt ends: cube into 1.5\" pieces, toss in sauce, return to 275°F uncovered for 30–45 min until caramelized."}
    ],
    tip:"For burnt ends: pull at 200°F, cube, sauce (honey + BBQ + butter), smoke uncovered at 275°F until edges are sticky and bark-like. The second cook is where they become exceptional."
  },
  "Ham": {
    p:["Apple","Cherry","Pecan","Maple"],
    pn:"Fruit woods and maple = classic ham pairing, sweet and complementary. Avoid strong hardwoods — they fight the cure.",
    pull:160, pit:250, stall:false, co:5,
    stages:[
      {n:1, t:"250°F", w:"After optional 12–24 hr brine", d:"Until 130°F", a:"Score fat cap in diamond pattern. Start low for deep smoke penetration into the thick meat."},
      {n:2, t:"325°F", w:"At 130°F", d:"Until 155°F", a:"Raise temp to push through. Glaze with honey/brown sugar mixture every 15 min for a lacquered crust."},
      {n:3, t:"Off", w:"At 155°F", d:"20–30 min", a:"Rest 20–30 min tented. Carryover brings to 160°F. Slice or pull."}
    ],
    tip:"Pre-cured/smoked ham just needs reheating — pull at 140°F internal. Fresh (uncured) ham needs 160°F. Glaze = honey + brown sugar + Dijon + apple cider vinegar. Apply in layers, not all at once."
  },
  "Pork Chops": {
    p:["Apple","Cherry","Pecan"],
    pn:"Mild woods only — pork chops are lean and over-smoke easily. Apple or cherry is ideal.",
    pull:145, pit:225, stall:false, co:5,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"Until 130–135°F", a:"1–1.5\" bone-in or boneless. This cut dries out fast — watch the probe, don't walk away."},
      {n:2, t:"450°F", w:"At 130–135°F", d:"4–6 min", a:"Sear 2–3 min per side. High heat builds crust fast — don't overdo it."},
      {n:3, t:"Off", w:"At 145°F", d:"5 min", a:"Rest 5 min tented. Slightly pink center at 145°F is safe and ideal per USDA."}
    ],
    tip:"Brine for 2–4 hrs before smoking (1 tbsp salt + 1 tbsp sugar per cup of water). Lean cuts need moisture insurance. Bone-in chops retain moisture better than boneless."
  },
  "Wings": {
    p:["Cherry","Apple","Hickory","Pecan"],
    pn:"Cherry = beautiful mahogany color. Apple = mild and sweet. Hickory and pecan add more smoke depth — wings can handle it.",
    pull:175, pit:375, stall:false, co:3,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"45 min", a:"Smoke phase for color and penetration. Wings handle stronger wood than whole birds."},
      {n:2, t:"375°F", w:"After smoke phase", d:"Until 175°F", a:"Raise to high heat for crispy skin. Flip halfway through."},
      {n:3, t:"375°F", w:"At 175°F (optional)", d:"5–10 min sauced", a:"Toss in sauce, return to 375°F briefly to caramelize."}
    ],
    tip:"Pat wings completely dry, season, then refrigerate uncovered 1 hr before smoking — the pellicle that forms accelerates crispiness. Add 1 tsp baking powder per lb to the dry rub to crisp skin faster."
  },
  "Cornish Hen": {
    p:["Cherry","Apple","Pecan"],
    pn:"Fruit woods pair perfectly with small birds. Cherry adds color; apple keeps it light and sweet.",
    pull:165, pit:300, stall:false, co:5,
    stages:[
      {n:1, t:"300°F", w:"Cook start", d:"Until 150°F breast", a:"Breast-side up. Cooks faster than whole chicken — stay closer to the smoker."},
      {n:2, t:"375°F", w:"At 150°F", d:"Until 165°F", a:"Raise temp to finish and crisp skin. This phase goes fast."},
      {n:3, t:"Off", w:"At 165°F", d:"5–10 min", a:"Rest 5–10 min. Verify thigh at 175°F. Serve whole or split along the backbone."}
    ],
    tip:"Spatchcock it (remove the backbone) for faster, more even cooking and better skin everywhere. One bird per person is the perfect portion."
  },
  "Leg of Lamb": {
    p:["Oak","Cherry","Pecan"],
    pn:"Oak = clean backbone smoke. Cherry adds color and mild sweetness. Avoid heavy hardwoods — lamb has a distinct flavor that competes.",
    pull:145, pit:250, stall:false, co:8,
    stages:[
      {n:1, t:"250°F", w:"Cook start", d:"Until 130°F", a:"Bone-in or boneless, fat-side up. Score the fat cap and stud with garlic cloves. The scoring helps fat render and allows garlic flavor in."},
      {n:2, t:"350°F", w:"At 130°F", d:"Until 138–140°F", a:"Raise temp to finish and form a crust on the exterior."},
      {n:3, t:"Off", w:"At 140°F", d:"15–20 min", a:"Rest well — lamb is forgiving during rest. Carryover + rest brings to 145°F (medium)."}
    ],
    tip:"Medium rare = 130–135°F (rosy pink throughout). Medium = 140–145°F. Beyond 150°F lamb gets tough quickly. Stud generously with garlic and insert fresh rosemary sprigs into the scored cuts."
  },
  "Lamb Shoulder": {
    p:["Oak","Cherry","Pecan"],
    pn:"Oak or cherry = clean and complementary. Lamb shoulder is well-marbled and handles smoke well — don't under-smoke it.",
    pull:195, wrap:165, pit:250, stall:true, sr:"155–165°F", sd:"2–4 hrs", co:8,
    stages:[
      {n:1, t:"250°F", w:"Cook start", d:"Until 165°F", a:"Fat-side up. Lamb shoulder handles low/slow like pork butt. Build your bark first."},
      {n:2, t:"250°F", w:"At 165°F", d:"Until 195°F", a:"Wrap with a splash of red wine or beef broth. Powers through the stall, adds depth."},
      {n:3, t:"Off", w:"At 195°F", d:"30–60 min", a:"Rest 30–60 min. Pull apart or slice — both work at 195°F+."}
    ],
    tip:"For sliceable texture, pull at 185°F. For pulled lamb, take it to 205°F. The flavor is more forgiving of temp variation than beef brisket — this cut is hard to overcook if you rest it."
  },
  "Rack of Lamb": {
    p:["Cherry","Apple","Oak"],
    pn:"Cherry = beautiful pink-mahogany crust. Apple = subtle sweetness. Light oak = neutral backbone. Avoid strong woods — delicate lamb flavor is easily overpowered.",
    pull:130, pit:225, stall:false, co:8,
    stages:[
      {n:1, t:"225°F", w:"Cook start", d:"Until 115–118°F", a:"Bone-side down, bones frenched if possible. The rack is small and cooks faster than you expect — watch it."},
      {n:2, t:"450°F", w:"At 115–118°F", d:"4–6 min", a:"Sear on all sides, rotating every 90 seconds, until a tight crust forms."},
      {n:3, t:"Off", w:"At 128–130°F", d:"5–10 min", a:"Rest tented 5–10 min. Slice between bones into individual chops."}
    ],
    tip:"Set your PitLogic alert at 110°F — the rack is small and temp rises fast once you sear. Frenching the bones (cleaning the rib tips) makes for a dramatic presentation."
  }
};
