#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

# Update system
dnf update -y

# Install FFmpeg and dependencies
dnf install -y ffmpeg aws-cli

# Create processing directory
mkdir -p /home/ec2-user/video-processing
cd /home/ec2-user/video-processing

# Download original videos
echo "Downloading original videos..."
aws s3 cp s3://medhdocuments/Website/1659171_Trapcode_Particles_3840x2160.mp4 ./dark_original.mp4
aws s3 cp s3://medhdocuments/Website/0_Wind_Flowing_3840x2160.mp4 ./light_original.mp4

echo "Starting video compression..."

# Dark theme - WebM high quality
echo "Processing dark theme WebM high quality..."
ffmpeg -i dark_original.mp4 \
    -c:v libvpx-vp9 -crf 28 -b:v 0 -threads 8 -speed 2 \
    -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 \
    -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 1659171_Trapcode_Particles_3840x2160_compressed.webm

# Dark theme - MP4 high quality  
echo "Processing dark theme MP4 high quality..."
ffmpeg -i dark_original.mp4 \
    -c:v libx264 -preset slow -crf 23 -movflags +faststart -an \
    -y 1659171_Trapcode_Particles_3840x2160_compressed.mp4

# Dark theme - WebM 1080p
echo "Processing dark theme WebM 1080p..."
ffmpeg -i dark_original.mp4 \
    -vf scale=1920:1080 -c:v libvpx-vp9 -crf 32 -b:v 0 \
    -threads 8 -speed 4 -tile-columns 6 -frame-parallel 1 \
    -auto-alt-ref 1 -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 1659171_Trapcode_Particles_1920x1080_compressed.webm

# Dark theme - MP4 1080p
echo "Processing dark theme MP4 1080p..."
ffmpeg -i dark_original.mp4 \
    -vf scale=1920:1080 -c:v libx264 -preset slow -crf 25 \
    -movflags +faststart -an \
    -y 1659171_Trapcode_Particles_1920x1080_compressed.mp4

# Light theme - WebM high quality
echo "Processing light theme WebM high quality..."
ffmpeg -i light_original.mp4 \
    -c:v libvpx-vp9 -crf 28 -b:v 0 -threads 8 -speed 2 \
    -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 \
    -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 0_Technology_Abstract_4096x2304_compressed.webm

# Light theme - MP4 high quality
echo "Processing light theme MP4 high quality..."
ffmpeg -i light_original.mp4 \
    -c:v libx264 -preset slow -crf 23 -movflags +faststart -an \
    -y 0_Technology_Abstract_4096x2304_compressed.mp4

# Light theme - WebM 1080p
echo "Processing light theme WebM 1080p..."
ffmpeg -i light_original.mp4 \
    -vf scale=1920:1080 -c:v libvpx-vp9 -crf 32 -b:v 0 \
    -threads 8 -speed 4 -tile-columns 6 -frame-parallel 1 \
    -auto-alt-ref 1 -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 0_Technology_Abstract_1920x1080_compressed.webm

# Light theme - MP4 1080p
echo "Processing light theme MP4 1080p..."
ffmpeg -i light_original.mp4 \
    -vf scale=1920:1080 -c:v libx264 -preset slow -crf 25 \
    -movflags +faststart -an \
    -y 0_Technology_Abstract_1920x1080_compressed.mp4

# Create poster images
echo "Creating poster images..."
ffmpeg -i dark_original.mp4 -ss 00:00:05 -vframes 1 -f webp -quality 85 -y dark_theme_poster.webp
ffmpeg -i light_original.mp4 -ss 00:00:05 -vframes 1 -f webp -quality 85 -y light_theme_poster.webp

# Upload compressed files to S3
echo "Uploading compressed files to S3..."

# Upload WebM files
for file in *_compressed.webm; do
    aws s3 cp "$file" s3://medhdocuments/Website/ \
        --content-type "video/webm" \
        --cache-control "max-age=31536000"
done

# Upload MP4 files
for file in *_compressed.mp4; do
    aws s3 cp "$file" s3://medhdocuments/Website/ \
        --content-type "video/mp4" \
        --cache-control "max-age=31536000"
done

# Upload WebP images
for file in *_poster.webp; do
    aws s3 cp "$file" s3://medhdocuments/Website/ \
        --content-type "image/webp" \
        --cache-control "max-age=31536000"
done

echo "Video compression completed!"
echo "File sizes:"
ls -lh *_compressed.* *_poster.*

# Create completion flag
touch /tmp/compression-complete

echo "All processing completed successfully!"
