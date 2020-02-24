#!/bin/bash
pdfname=$1
dir=$2
spectatorDB=$3

filename=$(basename $pdfname)
filename=${filename%.*}
mkdir -p $dir/$filename
magick -density 600 $pdfname -set colorspace RGB -alpha off -resize 2481x3508  $dir/$filename/page-%d.png
for j in $dir/$filename/*.png
do
  output=$(basename $j)
  output=${output%.*}
  tesseract $j $dir/$filename/$output -l eng tsv    
done

dbfiller $dir $filename $(ls $dir/$filename/*.png | wc -l) $spectatorDB

rm -rf $dir/$filename
