#!/usr/bin/env python3
"""Generate PWA icons for CodeWithSolo - dark luxury minimal design."""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

def generate_icon(size, output_path):
    """Generate a single icon at the given size."""
    # Work at 4x for anti-aliasing then downscale
    scale = 4
    s = size * scale
    
    # Create base image with transparency
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # --- Rounded rectangle background ---
    corner_radius = int(s * 0.18)  # ~18% radius for nice rounding
    
    # Draw gradient border first (slightly larger rounded rect)
    border_width = int(s * 0.03)  # 3% border
    
    # Create border with gradient from cyan to green
    border_img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border_img)
    
    # Draw the outer rounded rect (border area)
    border_draw.rounded_rectangle(
        [0, 0, s - 1, s - 1],
        radius=corner_radius,
        fill=(0, 0, 0, 255)  # placeholder
    )
    
    # Create gradient overlay for border
    gradient = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    for y in range(s):
        t = y / s  # 0 at top, 1 at bottom
        # Interpolate from #00d4ff (0,212,255) to #2cff8f (44,255,143)
        r = int(0 + t * (44 - 0))
        g = int(212 + t * (255 - 212))
        b = int(255 + t * (143 - 255))
        for x in range(s):
            gradient.putpixel((x, y), (r, g, b, 255))
    
    # Faster gradient: use line drawing
    gradient = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    gradient_draw = ImageDraw.Draw(gradient)
    for y in range(s):
        t = y / s
        r = int(0 + t * 44)
        g = int(212 + t * 43)
        b = int(255 + t * (143 - 255))
        gradient_draw.line([(0, y), (s - 1, y)], fill=(r, g, b, 255))
    
    # Mask gradient to border shape
    border_mask = Image.new('L', (s, s), 0)
    mask_draw = ImageDraw.Draw(border_mask)
    # Outer rounded rect
    mask_draw.rounded_rectangle(
        [0, 0, s - 1, s - 1],
        radius=corner_radius,
        fill=255
    )
    # Inner rounded rect (cut out)
    inner_margin = border_width
    inner_radius = max(corner_radius - border_width, 0)
    mask_draw.rounded_rectangle(
        [inner_margin, inner_margin, s - 1 - inner_margin, s - 1 - inner_margin],
        radius=inner_radius,
        fill=0
    )
    
    # Apply gradient border
    gradient.putalpha(border_mask)
    img = Image.alpha_composite(img, gradient)
    
    # --- Inner background fill (#0b0b14) ---
    bg_img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_img)
    bg_draw.rounded_rectangle(
        [inner_margin, inner_margin, s - 1 - inner_margin, s - 1 - inner_margin],
        radius=inner_radius,
        fill=(11, 11, 20, 255)  # #0b0b14
    )
    img = Image.alpha_composite(img, bg_img)
    
    # --- Subtle radial glow in center ---
    glow = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    center = s // 2
    glow_radius = int(s * 0.35)
    for y in range(center - glow_radius, center + glow_radius):
        for x in range(center - glow_radius, center + glow_radius):
            if 0 <= x < s and 0 <= y < s:
                dist = math.sqrt((x - center) ** 2 + (y - center) ** 2)
                if dist < glow_radius:
                    alpha = int(25 * (1 - dist / glow_radius) ** 2)
                    glow.putpixel((x, y), (0, 212, 255, alpha))
    img = Image.alpha_composite(img, glow)
    
    # --- Diamond / Rhombus shape ---
    diamond_img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    diamond_draw = ImageDraw.Draw(diamond_img)
    
    diamond_size = int(s * 0.28)  # size from center to vertex
    cx, cy = s // 2, s // 2
    
    # Diamond vertices (top, right, bottom, left)
    diamond_points = [
        (cx, cy - diamond_size),          # top
        (cx + diamond_size, cy),           # right
        (cx, cy + diamond_size),           # bottom
        (cx - diamond_size, cy),           # left
    ]
    
    # Draw filled diamond with cyan color
    diamond_draw.polygon(diamond_points, fill=(0, 212, 255, 255))
    
    # Add inner diamond for depth (slightly smaller, lighter)
    inner_diamond_size = int(diamond_size * 0.6)
    inner_diamond_points = [
        (cx, cy - inner_diamond_size),
        (cx + inner_diamond_size, cy),
        (cx, cy + inner_diamond_size),
        (cx - inner_diamond_size, cy),
    ]
    diamond_draw.polygon(inner_diamond_points, fill=(0, 230, 255, 80))
    
    # Add highlight line on top-left facet
    highlight_size = int(diamond_size * 0.85)
    highlight_points = [
        (cx, cy - highlight_size),
        (cx - highlight_size, cy),
        (cx, cy),
    ]
    diamond_draw.polygon(highlight_points, fill=(255, 255, 255, 25))
    
    img = Image.alpha_composite(img, diamond_img)
    
    # --- Diamond glow effect ---
    diamond_glow = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    dg_draw = ImageDraw.Draw(diamond_glow)
    glow_diamond_size = int(diamond_size * 1.15)
    glow_points = [
        (cx, cy - glow_diamond_size),
        (cx + glow_diamond_size, cy),
        (cx, cy + glow_diamond_size),
        (cx - glow_diamond_size, cy),
    ]
    dg_draw.polygon(glow_points, fill=(0, 212, 255, 30))
    diamond_glow = diamond_glow.filter(ImageFilter.GaussianBlur(radius=int(s * 0.04)))
    
    # Composite glow behind diamond
    temp = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    # Re-layer: background + border already in img, add glow then re-add diamond
    final = Image.alpha_composite(img, diamond_glow)
    # Re-draw diamond on top of glow
    final = Image.alpha_composite(final, diamond_img)
    
    # --- Downscale with high-quality resampling ---
    final = final.resize((size, size), Image.LANCZOS)
    
    # Save
    final.save(output_path, 'PNG', optimize=True)
    print(f"✅ Generated {output_path} ({size}x{size})")

# Generate both sizes
generate_icon(192, '/data/data/com.termux/files/home/projects/codewithsolo/icons/icon-192.png')
generate_icon(512, '/data/data/com.termux/files/home/projects/codewithsolo/icons/icon-512.png')
