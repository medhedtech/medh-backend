#!/bin/bash

# Video Compression Decision Script
# Choose between EC2 or local processing

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${BLUE}🎬 AWS Video Compression for Hero2.tsx${NC}"
echo "==========================================="
echo ""
echo "Original videos found in S3:"
echo "• Dark theme: 1659171_Trapcode_Particles_3840x2160.mp4 (186 MB)"
echo "• Light theme: 0_Flutter_Wind_3840x2160.mp4 (503 MB)"
echo ""
echo "Will generate:"
echo "• 8 compressed video files (WebM + MP4 in 4K & 1080p)"
echo "• 2 poster images (WebP format)"
echo ""
echo -e "${GREEN}Choose your compression method:${NC}"
echo ""
echo "1) 🚀 EC2 Instance (Fast, ~$3-5 cost)"
echo "   - Launches c5.4xlarge instance"
echo "   - Processes both videos in ~15-20 minutes"
echo "   - Automatically terminates after completion"
echo ""
echo "2) 🐳 AWS Batch (Cost-effective, setup required)"
echo "   - Uses containerized processing"
echo "   - Requires Docker image build/push"
echo "   - Most cost-effective for one-time jobs"
echo ""
echo "3) 💻 Local Processing (Free, requires FFmpeg)"
echo "   - Downloads videos to local machine"
echo "   - Processes locally with FFmpeg"
echo "   - Uploads compressed versions to S3"
echo ""
echo "4) 📋 Show commands only (No execution)"
echo "   - Display the FFmpeg commands to run manually"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo -e "${GREEN}🚀 Starting EC2 video compression...${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  This will:"
        echo "• Launch a c5.4xlarge EC2 instance (~$0.68/hour)"
        echo "• Process videos for ~15-20 minutes"
        echo "• Upload compressed files to S3"
        echo "• Terminate the instance automatically"
        echo "• Estimated cost: $3-5 total${NC}"
        echo ""
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            ./aws-video-compression-workflow.sh
        else
            echo "Cancelled."
        fi
        ;;
    2)
        echo -e "${GREEN}🐳 Setting up AWS Batch processing...${NC}"
        ./aws-batch-video-compression.sh
        ;;
    3)
        echo -e "${GREEN}💻 Setting up local processing...${NC}"
        
        # Check if FFmpeg is installed
        if ! command -v ffmpeg &> /dev/null; then
            echo -e "${RED}❌ FFmpeg not found. Please install FFmpeg first:${NC}"
            echo "macOS: brew install ffmpeg"
            echo "Ubuntu: sudo apt install ffmpeg"
            echo "Windows: Download from https://ffmpeg.org/"
            exit 1
        fi
        
        # Create local processing script
        cat > local-video-compression.sh << 'EOF'
#!/bin/bash
set -e

echo "📥 Downloading original videos..."
mkdir -p ./video-processing
cd ./video-processing

aws s3 cp s3://medhdocuments/Website/1659171_Trapcode_Particles_3840x2160.mp4 ./dark_theme_original.mp4
aws s3 cp s3://medhdocuments/Website/0_Flutter_Wind_3840x2160.mp4 ./light_theme_original.mp4

echo "🎬 Processing dark theme video..."
# Dark theme - WebM high quality
ffmpeg -i dark_theme_original.mp4 \
    -c:v libvpx-vp9 -crf 28 -b:v 0 -threads 8 -speed 2 \
    -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 \
    -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 1659171_Trapcode_Particles_3840x2160_compressed.webm

# Dark theme - MP4 high quality
ffmpeg -i dark_theme_original.mp4 \
    -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k \
    -movflags +faststart -an \
    -y 1659171_Trapcode_Particles_3840x2160_compressed.mp4

# Dark theme - WebM 1080p
ffmpeg -i dark_theme_original.mp4 \
    -vf scale=1920:1080 -c:v libvpx-vp9 -crf 32 -b:v 0 \
    -threads 8 -speed 4 -tile-columns 6 -frame-parallel 1 \
    -auto-alt-ref 1 -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 1659171_Trapcode_Particles_1920x1080_compressed.webm

# Dark theme - MP4 1080p
ffmpeg -i dark_theme_original.mp4 \
    -vf scale=1920:1080 -c:v libx264 -preset slow -crf 25 \
    -c:a aac -b:a 96k -movflags +faststart -an \
    -y 1659171_Trapcode_Particles_1920x1080_compressed.mp4

echo "🎬 Processing light theme video..."
# Light theme - WebM high quality
ffmpeg -i light_theme_original.mp4 \
    -c:v libvpx-vp9 -crf 28 -b:v 0 -threads 8 -speed 2 \
    -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 \
    -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 0_Technology_Abstract_4096x2304_compressed.webm

# Light theme - MP4 high quality
ffmpeg -i light_theme_original.mp4 \
    -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k \
    -movflags +faststart -an \
    -y 0_Technology_Abstract_4096x2304_compressed.mp4

# Light theme - WebM 1080p
ffmpeg -i light_theme_original.mp4 \
    -vf scale=1920:1080 -c:v libvpx-vp9 -crf 32 -b:v 0 \
    -threads 8 -speed 4 -tile-columns 6 -frame-parallel 1 \
    -auto-alt-ref 1 -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 0_Technology_Abstract_1920x1080_compressed.webm

# Light theme - MP4 1080p
ffmpeg -i light_theme_original.mp4 \
    -vf scale=1920:1080 -c:v libx264 -preset slow -crf 25 \
    -c:a aac -b:a 96k -movflags +faststart -an \
    -y 0_Technology_Abstract_1920x1080_compressed.mp4

echo "🖼️ Creating poster images..."
ffmpeg -i dark_theme_original.mp4 -ss 00:00:05 -vframes 1 -f webp -quality 85 -y dark_theme_poster.webp
ffmpeg -i light_theme_original.mp4 -ss 00:00:05 -vframes 1 -f webp -quality 85 -y light_theme_poster.webp

echo "📤 Uploading to S3..."
for file in *_compressed.webm; do
    aws s3 cp "$file" s3://medhdocuments/Website/ --content-type "video/webm" --cache-control "max-age=31536000"
done

for file in *_compressed.mp4; do
    aws s3 cp "$file" s3://medhdocuments/Website/ --content-type "video/mp4" --cache-control "max-age=31536000"
done

for file in *_poster.webp; do
    aws s3 cp "$file" s3://medhdocuments/Website/ --content-type "image/webp" --cache-control "max-age=31536000"
done

echo "✅ Local processing completed!"
echo "📊 Final file sizes:"
ls -lh *_compressed.* *_poster.*

# Cleanup
cd ..
rm -rf ./video-processing
EOF
        
        chmod +x local-video-compression.sh
        echo ""
        echo -e "${YELLOW}⚠️  Local processing will:"
        echo "• Download 689MB of original videos"
        echo "• Use ~70% CPU for 30-45 minutes"
        echo "• Generate ~8GB of temporary files"
        echo "• Upload compressed files to S3${NC}"
        echo ""
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            ./local-video-compression.sh
        else
            echo "Cancelled. Script saved as local-video-compression.sh"
        fi
        ;;
    4)
        echo -e "${GREEN}📋 FFmpeg Commands:${NC}"
        echo ""
        echo "1. Download original videos:"
        echo "aws s3 cp s3://medhdocuments/Website/1659171_Trapcode_Particles_3840x2160.mp4 ./dark_original.mp4"
        echo "aws s3 cp s3://medhdocuments/Website/0_Flutter_Wind_3840x2160.mp4 ./light_original.mp4"
        echo ""
        echo "2. Compress dark theme (WebM high):"
        echo "ffmpeg -i dark_original.mp4 -c:v libvpx-vp9 -crf 28 -b:v 0 -threads 8 -speed 2 -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -g 999999 -aq-mode 0 -an -y dark_4k.webm"
        echo ""
        echo "3. Compress dark theme (MP4 high):"
        echo "ffmpeg -i dark_original.mp4 -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart -an -y dark_4k.mp4"
        echo ""
        echo "4. Repeat for 1080p versions with -vf scale=1920:1080"
        echo "5. Repeat for light theme video"
        echo "6. Create posters with: ffmpeg -i input.mp4 -ss 00:00:05 -vframes 1 -f webp -quality 85 -y poster.webp"
        echo ""
        echo "7. Upload to S3 with proper content-type and cache-control headers"
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac 