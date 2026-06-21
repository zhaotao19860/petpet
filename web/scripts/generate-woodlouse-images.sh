#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="/Users/tom/.comate/skills/.system/create-image"
export COMATE_USERNAME_ENCRYPTED="AdTEH8+IiYXAnCa/SnEGEg=="

stage_description() {
  case "$1" in
    01) echo "newly hatched tiny manca juvenile, extremely small pale translucent grey body, very soft and delicate segmented plates, tiny legs barely visible, damp soil grains look large beside it" ;;
    02) echo "newly hatched juvenile, still very small and pale, faint oval body outline, early segmented armor plates just beginning to show, resting on wet leaf litter" ;;
    03) echo "early juvenile, tiny pale grey woodlouse, slightly clearer body segments, short antennae visible, cautious crawling posture on damp decaying leaf" ;;
    04) echo "young juvenile becoming more active, small light grey oval body, first clear dorsal segments, tiny legs tucked below, moist brown leaf litter around it" ;;
    05) echo "young juvenile, light grey body with clearer segmented armor, slightly larger than hatchling, crawling slowly beside a small rotting wood chip" ;;
    06) echo "young juvenile after early growth, pale grey-white exoskeleton, oval shape more stable, many small body plates visible, damp soil and moss background" ;;
    07) echo "late early juvenile, small but recognizably pill bug shaped, grey-white segmented back, short antennae, under a moist curled dead leaf" ;;
    08) echo "growing juvenile, oval body larger, segmented dorsal plates more distinct, color shifting from pale grey to soft slate grey, macro view on wet humus" ;;
    09) echo "juvenile after a growth molt, smooth grey segmented armor, body thicker, tiny legs hidden under sides, moist leaf veins in background" ;;
    10) echo "juvenile woodlouse, medium-small oval body, clearly separated armored plates, muted grey color, crawling over decaying leaf fragments" ;;
    11) echo "juvenile with stronger proportions, darker grey back, visible short antennae, many tiny legs tucked below, damp soil and rotting wood habitat" ;;
    12) echo "late juvenile, rounded oval body, segmented shell clearly visible, still smaller than adult, soft natural macro lighting on wet leaf litter" ;;
    13) echo "young adolescent woodlouse, body growing longer and wider, grey-brown segmented armor, legs and antennae clearer, realistic terrestrial isopod anatomy" ;;
    14) echo "adolescent stage, typical pill bug shape, moderately sized oval armored body, slate grey plates, walking slowly beside moss and decomposing leaves" ;;
    15) echo "adolescent after another molt, body plates thicker and more defined, grey brown exoskeleton, single individual in damp shaded habitat" ;;
    16) echo "late adolescent, close to adult shape, oval segmented carapace, short antennae forward, tiny legs beneath body, moist rotting leaf environment" ;;
    17) echo "subadult woodlouse, larger body, thicker armor plates, color becoming grey-brown and slate, realistic macro photograph on damp forest floor" ;;
    18) echo "subadult, robust oval body, strong segmented back plates, slightly darker edges, many tiny legs barely visible, wet decaying leaf litter" ;;
    19) echo "subadult after growth, adult-like proportions, smooth curved segmented shell, grey-brown exoskeleton, one individual only in humid shaded soil" ;;
    20) echo "late subadult, almost mature, well-defined armored plates, oval body full and balanced, short antennae, realistic damp leaf litter habitat" ;;
    21) echo "near adult woodlouse, firm slate-grey segmented exoskeleton, body size close to adult, walking calmly over rotten wood fibers" ;;
    22) echo "young adult pill bug, full oval armored body, clear overlapping dorsal plates, grey-brown shell, healthy adult posture in moist leaf litter" ;;
    23) echo "adult woodlouse, mature size, thick segmented armor, short antennae, many tiny legs under body, realistic macro photo beside a wet brown leaf" ;;
    24) echo "adult in alert posture, oval body slightly arched as if ready to curl, dark grey-brown segmented plates, damp soil and moss around it" ;;
    25) echo "mature adult, full robust body, detailed armored plates and subtle shell texture, one realistic pill bug on decaying leaves" ;;
    26) echo "fully mature stable adult, largest healthy body, prominent slate grey segmented exoskeleton, moist forest floor, natural macro lighting" ;;
    27) echo "mature adult with very clear plate texture, grey-brown shell, calm crawling posture, damp rotting leaf and soft moss details" ;;
    28) echo "mature adult at peak size, oval armored body, strong dorsal ridges, subtle natural wear on shell, single individual in humid leaf litter" ;;
    29) echo "older adult woodlouse, slightly darker grey shell, mild natural edge wear on segmented plates, slower calm posture, not injured, damp shaded habitat" ;;
    30) echo "elder mature woodlouse, dark slate-grey segmented armor with subtle worn texture, full oval body, calm slow posture, healthy not dead, moist decaying leaves" ;;
  esac
}

for day in $(seq -w 1 30); do
  description="$(stage_description "$day")"
  prompt="A single realistic pill bug / roly-poly woodlouse, Armadillidium vulgare, day ${day} of a compressed 30-day growth journey. One individual only, centered subject, accurate terrestrial isopod anatomy: oval segmented armored body, many tiny legs tucked under the body, short antennae, grey-brown exoskeleton, moist leaf litter habitat, damp soil, decaying leaves, soft natural macro photography lighting. Show the correct age stage: ${description}. No cartoon, no fantasy, no insect wings, no caterpillar, no beetle, no spider, no centipede, no millipede, no long legs, no multiple animals, no text, no labels, no watermark, no human hands."
  output="woodlouse-pillbug-age-${day}-v1.png"
  bash "${SKILL_DIR}/scripts/generate-image.sh" --prompt "$prompt" --output "$output" --aspect-ratio 1:1 --resolution 1K
 done
