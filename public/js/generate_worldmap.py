import random

file = open("worldmap.dat", "w")
for y in range(128):
	for x in range(128):
		tile = str(random.choice([0] * 9 + [1] * 4))
		file.write(tile)
	file.write("\n")
	print y
file.close()
print "Done."