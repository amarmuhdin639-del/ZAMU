#!/bin/bash
# Re-encode the GTA Fashion hero loop from the TikTok screen recording.
# Player area inside the 1440x852 recording sits at crop=335:590:210:105.
# Long encodes get killed by the sandbox, so cut 3 x 5.5s chunks + concat copy.
set -e
cd /home/z/my-project
SRC="upload/Find 'GTA fashion' on TikTok _ TikTok Search - Google Chrome 2026-10-01 06-35-06.mp4"
OUT="public/uploads/site/hero.mp4"
TMP="scripts/tmp-hero"
VF="crop=335:590:210:105,scale=540:952:flags=lanczos,eq=contrast=1.04:saturation=1.06"
ENC="-c:v libx264 -profile:v baseline -level 3.1 -preset veryfast -crf 26 -pix_fmt yuv420p -an"

mkdir -p "$TMP" public/uploads/site

ffmpeg -y -loglevel error -ss 26.5 -t 5.5 -i "$SRC" -vf "$VF" $ENC "$TMP/a.mp4"
ffmpeg -y -loglevel error -ss 32   -t 5.5 -i "$SRC" -vf "$VF" $ENC "$TMP/b.mp4"
ffmpeg -y -loglevel error -ss 37.5 -t 5.5 -i "$SRC" -vf "$VF" $ENC "$TMP/c.mp4"

printf "file 'a.mp4'\nfile 'b.mp4'\nfile 'c.mp4'\n" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy -movflags +faststart "$OUT"
rm -rf "$TMP"
ls -la "$OUT"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of csv=p=0 "$OUT"
