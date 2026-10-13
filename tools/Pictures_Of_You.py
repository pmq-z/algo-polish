##	=======================	##
##		PICTURES OF YOU	 	##
##	======================= ##

#	=== IMPORTS ===	#
import math
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

#	=== PALETTE ===	#
Ink = (15, 15, 16, 255)
Plum = (122, 38, 80, 255)
Paper_Top = (212, 212, 215, 255)
Paper_Bottom = (194, 194, 198, 255)
Icon_Sizes = [16, 48, 128]
Supersample = 8
Out_Folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")

#	=== SHAPES ===	#

# "Somewhere over the rainbow"
def Over_The_Rainbow(Width, Height, Top, Bottom):
	Canvas = Image.new("RGBA", (Width, Height))
	Pen = ImageDraw.Draw(Canvas)
	# loop n-1 rows, then act once more on the last row
	for Row in range(Height - 1):
		Mix = Row / (Height - 1)
		Colour = tuple(round(A + (B - A) * Mix) for A, B in zip(Top, Bottom))
		Pen.line([(0, Row), (Width, Row)], fill=Colour)
	Pen.line([(0, Height - 1), (Width, Height - 1)], fill=Bottom)
	return Canvas

# "I'm in love with the shape of you"
def Shape_Of_You(Size):
	Margin = Size * 0.03
	Box = [Margin, Margin, Size - Margin, Size - Margin]
	# two masks, each rounding a different pair of corners, then keep their overlap
	Big_Corners = Image.new("L", (Size, Size), 0)
	ImageDraw.Draw(Big_Corners).rounded_rectangle(Box, radius=Size * 0.30, fill=255, corners=(False, True, False, True))
	Small_Corners = Image.new("L", (Size, Size), 0)
	ImageDraw.Draw(Small_Corners).rounded_rectangle(Box, radius=Size * 0.07, fill=255, corners=(True, False, True, False))
	return ImageChops.multiply(Big_Corners, Small_Corners)

# "Black hole sun, won't you come?"
def Black_Hole_Sun(Size):
	Layer = Image.new("RGBA", (Size, Size), (0, 0, 0, 0))
	Centre_X, Centre_Y, Reach = Size * 0.5, Size * 0.80, Size * 0.40
	ImageDraw.Draw(Layer).ellipse([Centre_X - Reach, Centre_Y - Reach, Centre_X + Reach, Centre_Y + Reach], fill=Ink)
	return Layer

# "I am the walrus... goo goo g'joob" (a Beatles glass onion, here a glass capsule)
def Glass_Onion(Size):
	Layer = Image.new("RGBA", (Size, Size), (0, 0, 0, 0))
	Left, Right, Top, Bottom = Size * 0.33, Size * 0.67, Size * 0.18, Size * 0.84
	Radius = (Right - Left) / 2

	Shadow = Image.new("L", (Size, Size), 0)
	ImageDraw.Draw(Shadow).rounded_rectangle([Left, Top + Size * 0.04, Right, Bottom + Size * 0.04], radius=Radius, fill=90)
	Shadow = Shadow.filter(ImageFilter.GaussianBlur(Size * 0.03))
	Layer.paste((0, 0, 0, 255), (0, 0, Size, Size), Shadow)

	Capsule = Image.new("L", (Size, Size), 0)
	ImageDraw.Draw(Capsule).rounded_rectangle([Left, Top, Right, Bottom], radius=Radius, fill=255)
	Glass = Over_The_Rainbow(Size, Size, (255, 255, 255, 235), (255, 255, 255, 90))
	Glass.putalpha(ImageChops.multiply(Glass.getchannel("A"), Capsule))
	Layer = Image.alpha_composite(Layer, Glass)

	Rim = max(1, round(Size / 60))
	ImageDraw.Draw(Layer).rounded_rectangle([Left, Top, Right, Bottom], radius=Radius, outline=(255, 255, 255, 215), width=Rim)
	return Layer

# "Twinkle, twinkle, little star"
def Twinkle_Twinkle_Little_Star(Size):
	Layer = Image.new("RGBA", (Size, Size), (0, 0, 0, 0))
	Centre_X, Centre_Y, Outer = Size * 0.5, Size * 0.40, Size * 0.13
	Points = []
	for Spike in range(8):
		Angle = Spike * math.pi / 4 - math.pi / 2
		# modulo trick: even spikes are long, odd ones short
		Reach = Outer if Spike % 2 == 0 else Outer * 0.25
		Points.append((Centre_X + math.cos(Angle) * Reach, Centre_Y + math.sin(Angle) * Reach))
	ImageDraw.Draw(Layer).polygon(Points, fill=Plum)
	return Layer

# "Do the square dance" (the tiny corner mark on every panel)
def Square_Dance(Size):
	Layer = Image.new("RGBA", (Size, Size), (0, 0, 0, 0))
	Edge, Mark = Size * 0.11, Size * 0.06
	ImageDraw.Draw(Layer).rectangle([Edge, Edge, Edge + Mark, Edge + Mark], fill=Ink)
	return Layer

#	=== MAIN ===	#

# "Pictures of you, pictures of me"
def Pictures_Of_You():
	# confirm there is something to draw and somewhere to put it
	if len(Icon_Sizes) == 0:
		print("No icon sizes listed.")
		return
	elif len(Icon_Sizes) > 0:
		if os.path.isdir(Out_Folder) == False:
			os.makedirs(Out_Folder)

	for Real_Size in Icon_Sizes:
		Size = Real_Size * Supersample
		Canvas = Over_The_Rainbow(Size, Size, Paper_Top, Paper_Bottom)
		Canvas = Image.alpha_composite(Canvas, Black_Hole_Sun(Size))
		Canvas = Image.alpha_composite(Canvas, Glass_Onion(Size))
		Canvas = Image.alpha_composite(Canvas, Twinkle_Twinkle_Little_Star(Size))
		# the corner mark is too small to read below 32 px
		if Real_Size >= 32:
			Canvas = Image.alpha_composite(Canvas, Square_Dance(Size))
		elif Real_Size < 32:
			pass
		Canvas.putalpha(ImageChops.multiply(Canvas.getchannel("A"), Shape_Of_You(Size)))
		Small = Canvas.resize((Real_Size, Real_Size), Image.LANCZOS)
		Small.save(os.path.join(Out_Folder, "Pictures_Of_You_" + str(Real_Size) + ".png"))
		print("drew", Real_Size)

if __name__ == "__main__":
	Pictures_Of_You()
