import random

file = open("worldmap.dat", "wb")
weights = {
	0: 33,
	1: 4
}
choices = []
for item in weights:
	choices += [item] * weights[item]

for y in range(128):
	for x in range(128):
		tile = random.choice(choices)
		file.write(chr(tile))
	file.write("\n")
file.close()
print "Done."