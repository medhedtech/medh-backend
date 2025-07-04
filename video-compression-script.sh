#!/bin/bash

# Install FFmpeg on Amazon Linux 2023
sudo dnf update -y
sudo dnf install -y ffmpeg aws-cli

# Create working directory
mkdir -p /tmp/video-processing
cd /tmp/video-processing

# Download original videos from S3
echo "Downloading original videos..."
aws s3 cp s3://medhdocuments/Website/1659171_Trapcode_Particles_3840x2160.mp4 ./dark_theme_original.mp4
aws s3 cp s3://medhdocuments/Website/0_Flutter_Wind_3840x2160.mp4 ./light_theme_original.mp4

# Function to compress videos
compress_video() {
    local input_file="$1"
    local output_base="$2"
    local theme_type="$3"
    
    echo "🎬 Processing $theme_type theme video: $input_file"
    
    # WebM High Quality (Original Resolution)
    echo "Creating WebM high quality..."
    ffmpeg -i "$input_file" \
        -c:v libvpx-vp9 \
        -crf 28 \
        -b:v 0 \
        -threads 8 \
        -speed 2 \
        -tile-columns 6 \
        -frame-parallel 1 \
        -auto-alt-ref 1 \
        -lag-in-frames 25 \
        -g 999999 \
        -aq-mode 0 \
        -an \
        -y "${output_base}_compressed.webm"
    
    # MP4 High Quality (Original Resolution)
    echo "Creating MP4 high quality..."
    ffmpeg -i "$input_file" \
        -c:v libx264 \
        -preset slow \
        -crf 23 \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        -an \
        -y "${output_base}_compressed.mp4"
    
    # WebM Medium Quality (1080p)
    echo "Creating WebM 1080p..."
    ffmpeg -i "$input_file" \
        -vf scale=1920:1080 \
        -c:v libvpx-vp9 \
        -crf 32 \
        -b:v 0 \
        -threads 8 \
        -speed 4 \
        -tile-columns 6 \
        -frame-parallel 1 \
        -auto-alt-ref 1 \
        -lag-in-frames 25 \
        -g 999999 \
        -aq-mode 0 \
        -an \
        -y "${output_base}_1920x1080_compressed.webm"
    
    # MP4 Medium Quality (1080p)
    echo "Creating MP4 1080p..."
    ffmpeg -i "$input_file" \
        -vf scale=1920:1080 \
        -c:v libx264 \
        -preset slow \
        -crf 25 \
        -c:a aac \
        -b:a 96k \
        -movflags +faststart \
        -an \
        -y "${output_base}_1920x1080_compressed.mp4"
    
    # Create poster image
    echo "Creating poster image..."
    ffmpeg -i "$input_file" \
        -ss 00:00:05 \
        -vframes 1 \
        -f webp \
        -quality 85 \
        -y "${theme_type}_theme_poster.webp"
}

# Process Dark Theme Video
compress_video "dark_theme_original.mp4" "1659171_Trapcode_Particles_3840x2160" "dark"

# Process Light Theme Video  
compress_video "light_theme_original.mp4" "0_Technology_Abstract_4096x2304" "light"

# Upload compressed videos to S3
echo "📤 Uploading compressed videos to S3..."

# Upload all compressed files
aws s3 cp 1659171_Trapcode_Particles_3840x2160_compressed.webm s3://medhdocuments/Website/
aws s3 cp 1659171_Trapcode_Particles_3840x2160_compressed.mp4 s3://medhdocuments/Website/
aws s3 cp 1659171_Trapcode_Particles_1920x1080_compressed.webm s3://medhdocuments/Website/
aws s3 cp 1659171_Trapcode_Particles_1920x1080_compressed.mp4 s3://medhdocuments/Website/

aws s3 cp 0_Technology_Abstract_4096x2304_compressed.webm s3://medhdocuments/Website/
aws s3 cp 0_Technology_Abstract_4096x2304_compressed.mp4 s3://medhdocuments/Website/
aws s3 cp 0_Technology_Abstract_1920x1080_compressed.webm s3://medhdocuments/Website/
aws s3 cp 0_Technology_Abstract_1920x1080_compressed.mp4 s3://medhdocuments/Website/

# Upload poster images
aws s3 cp dark_theme_poster.webp s3://medhdocuments/Website/
aws s3 cp light_theme_poster.webp s3://medhdocuments/Website/

# Set proper content types and cache headers
echo "🔧 Setting S3 metadata..."
for file in \
    "1659171_Trapcode_Particles_3840x2160_compressed.webm" \
    "1659171_Trapcode_Particles_1920x1080_compressed.webm" \
    "0_Technology_Abstract_4096x2304_compressed.webm" \
    "0_Technology_Abstract_1920x1080_compressed.webm"
do
    aws s3 cp s3://medhdocuments/Website/$file s3://medhdocuments/Website/$file \
        --metadata-directive REPLACE \
        --content-type "video/webm" \
        --cache-control "max-age=31536000" \
        --expires "$(date -d '+1 year' --iso-8601)"
done

for file in \
    "1659171_Trapcode_Particles_3840x2160_compressed.mp4" \
    "1659171_Trapcode_Particles_1920x1080_compressed.mp4" \
    "0_Technology_Abstract_4096x2304_compressed.mp4" \
    "0_Technology_Abstract_1920x1080_compressed.mp4"
do
    aws s3 cp s3://medhdocuments/Website/$file s3://medhdocuments/Website/$file \
        --metadata-directive REPLACE \
        --content-type "video/mp4" \
        --cache-control "max-age=31536000" \
        --expires "$(date -d '+1 year' --iso-8601)"
done

for file in "dark_theme_poster.webp" "light_theme_poster.webp"
do
    aws s3 cp s3://medhdocuments/Website/$file s3://medhdocuments/Website/$file \
        --metadata-directive REPLACE \
        --content-type "image/webp" \
        --cache-control "max-age=31536000" \
        --expires "$(date -d '+1 year' --iso-8601)"
done

echo "✅ Video compression and upload completed!"

# Display file sizes
echo "📊 Final file sizes:"
ls -lh *.webm *.mp4 *.webp

# Cleanup
rm -f dark_theme_original.mp4 light_theme_original.mp4

echo "🎉 All done! Videos are ready for CloudFront."
