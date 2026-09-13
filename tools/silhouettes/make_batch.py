"""
Build a comfy_batch items file for every non-animal pool object that has no silhouette in lib/ yet.
usage: python make_batch.py <out.json> [--all]
The measured dimension picks the view (length -> side, width -> front, height -> side/front, diameter -> side);
vehicles get the blueprint side-elevation prompt. SUBJECT tweaks phrasing where the pool name alone is ambiguous.
"""
import csv, json, sys
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
BLUEPRINT = ("pure 2D orthographic projection exactly perpendicular to the side, no perspective, no foreshortening, "
             "all wheels perfectly round and aligned on one baseline, solid dark fill")

SUBJECT = {
    'newborn-baby': 'a newborn baby lying on its back, full body', 'toddler': 'a standing toddler, full body',
    'adult-woman': 'a standing adult woman, full body, arms at her sides', 'adult-man': 'a standing adult man, full body, arms at his sides',
    'basketball-player': 'a very tall standing basketball player, full body, arms at his sides',
    'human-hand': 'an open human hand, palm facing the viewer, fingers together', 'human-foot': 'a bare human foot',
    'human-eye': 'a human eyeball', 'human-tooth': 'a single human molar tooth with roots', 'human-hair': 'a single straight strand of hair, vertical',
    'red-blood-cell': 'a single red blood cell, biconcave disc', 'door': 'a closed interior door with frame and handle',
    'credit-card': 'a plain blank credit card, landscape', 'smartphone': 'a modern smartphone standing upright', 'a4-paper': 'a blank sheet of A4 paper, portrait',
    'pencil': 'a sharpened wooden pencil, horizontal', 'pen': 'a ballpoint pen, horizontal', 'paperclip': 'a paperclip, horizontal',
    'euro-coin': 'a plain round coin, face on', 'us-quarter': 'a plain round coin, face on', 'pet-bottle': 'a 1.5 litre plastic water bottle with cap',
    'beer-bottle': 'a beer bottle', 'apple': 'an apple with stem', 'watermelon': 'a whole oval watermelon, horizontal', 'chicken-egg': 'a chicken egg, pointed end up',
    'baguette': 'a baguette, horizontal', 'pizza': 'a whole round pizza seen from directly above', 'hamburger': 'a hamburger',
    'wine-glass': 'an empty wine glass', 'fork': 'a dinner fork, horizontal', 'chefs-knife': "a chef's knife, horizontal, blade pointing left",
    'dinner-plate': 'a round dinner plate seen from directly above', 'toothbrush': 'a toothbrush, horizontal', 'toilet-roll': 'a roll of toilet paper, end on, showing the round tube',
    'bar-of-soap': 'a bar of soap, horizontal', 'light-bulb': 'a classic pear-shaped light bulb, screw base down', 'aa-battery': 'an AA battery, horizontal',
    'usb-stick': 'a USB flash drive, horizontal', 'laptop': 'an open laptop computer seen from the front', 'computer-mouse': 'a computer mouse',
    'keyboard': 'a computer keyboard seen from directly above', 'tv-55': 'a flat screen TV on a stand, front view', 'remote-control': 'a TV remote control, horizontal',
    'paperback-book': 'a closed paperback book standing upright, front cover facing the viewer', 'violin': 'a violin, horizontal', 'grand-piano': 'a concert grand piano with the lid open',
    'upright-piano': 'an upright piano, front view', 'football': 'a soccer ball', 'basketball': 'a basketball', 'tennis-ball': 'a tennis ball', 'golf-ball': 'a golf ball',
    'baseball': 'a baseball', 'bowling-ball': 'a bowling ball', 'ping-pong-ball': 'a table tennis ball', 'baseball-bat': 'a baseball bat, horizontal',
    'tennis-racket': 'a tennis racket, horizontal, face on', 'hockey-stick': 'an ice hockey stick, horizontal', 'skateboard': 'a skateboard', 'surfboard': 'a surfboard, horizontal, face on',
    'skis': 'a pair of alpine skis, horizontal', 'basketball-hoop': 'a basketball hoop with backboard on a pole', 'football-goal': 'a football goal with net, front view',
    'tennis-net': 'a tennis net between two posts, front view', 'bowling-pin': 'a bowling pin', 'chess-king': 'a chess king piece', 'rubiks-cube': "a Rubik's cube, face on",
    'lego-brick': 'a single 2x4 toy building brick, horizontal', 'playing-card': 'a playing card, portrait, back side plain', 'die': 'a single six-sided die, face on',
    'dining-table': 'a dining table', 'double-bed': 'a double bed with headboard', 'sofa': 'a three-seat sofa, front view', 'refrigerator': 'a refrigerator, front view',
    'washing-machine': 'a front-loading washing machine, front view', 'microwave': 'a microwave oven, front view', 'toaster': 'a two-slot toaster', 'kettle': 'an electric kettle',
    'bathtub': 'a freestanding bathtub', 'toilet': 'a toilet', 'stepladder': 'an open stepladder', 'umbrella': 'an open umbrella, handle down',
    'carry-on-suitcase': 'an upright carry-on suitcase with extended handle', 'backpack': 'a backpack', 'mens-shoe': "a men's leather shoe", 'wristwatch': 'a wristwatch face with strap, face on',
    'eyeglasses': 'a pair of eyeglasses, front view', 'house-key': 'a house key, horizontal', 'matchstick': 'a matchstick, horizontal', 'candle': 'a candle',
    'brick': 'a single clay brick, horizontal', 'cinder-block': 'a concrete cinder block', 'pallet': 'a wooden euro pallet', 'traffic-cone': 'a traffic cone', 'stop-sign': 'an octagonal stop sign on a post, face on',
    'traffic-light': 'a three-light traffic light housing, front view', 'fire-hydrant': 'a fire hydrant', 'parking-meter': 'a parking meter on a post', 'us-mailbox': 'a US curbside mailbox on a post',
    'phone-box': 'a classic British red telephone box, front view', 'broom': 'a broom, horizontal', 'shovel': 'a shovel, horizontal', 'hammer': 'a claw hammer, horizontal',
    'screwdriver': 'a screwdriver, horizontal', 'wrench': 'an adjustable wrench, horizontal', 'chainsaw': 'a chainsaw', 'axe': 'a felling axe, horizontal', 'wheelbarrow': 'a wheelbarrow',
    'lawn-mower': 'a push lawn mower', 'christmas-tree': 'a christmas tree', 'sunflower': 'a tall sunflower with stem and leaves', 'oak-tree': 'a mature oak tree, full canopy',
    'coast-redwood': 'a very tall coast redwood tree', 'giant-sequoia': 'a giant sequoia tree', 'coconut-palm': 'a coconut palm tree', 'bamboo': 'a tall clump of giant bamboo',
    'mushroom': 'a button mushroom', 'grain-of-rice': 'a single grain of rice, horizontal', 'grain-of-sand': 'a single grain of sand', 'pea': 'a single pea', 'coffee-bean': 'a single coffee bean',
    'sugar-cube': 'a sugar cube, face on', 'marble': 'a glass marble', 'walnut': 'a walnut in its shell', 'coconut': 'a coconut', 'pumpkin': 'a pumpkin', 'pineapple': 'a pineapple with crown',
    'carrot': 'a carrot, horizontal', 'corn-cob': 'a corn on the cob with husk removed, horizontal', 'strawberry': 'a strawberry, leaves up', 'grape': 'a single grape', 'cherry': 'a cherry with stem',
    'lemon': 'a lemon, horizontal', 'orange': 'an orange', 'tomato': 'a tomato', 'potato': 'a potato, horizontal', 'bread-loaf': 'a loaf of bread', 'parmesan-wheel': 'a wheel of parmesan cheese, face on',
    'city-bus': 'a modern city bus', 'semi-truck': 'a European semi-truck with box trailer, cab on the left', 'pickup-truck': 'a full-size pickup truck', 'motorcycle': 'a motorcycle',
    'shopping-cart': 'a shopping cart', 'wheelchair': 'a manual wheelchair', 'stroller': 'a baby stroller', 'e-scooter': 'a stand-up electric kick scooter',
    'tram': 'a modern low-floor tram', 'train-car': 'a passenger railway carriage', 'boeing-737': 'a Boeing 737 airliner, nose pointing left, flat elevation',
    'airbus-a380': 'an Airbus A380 double-deck airliner, nose pointing left, flat elevation', 'cessna-172': 'a Cessna 172 light aircraft, nose pointing left, flat elevation',
    'helicopter': 'a light helicopter with skids, nose pointing left, flat elevation', 'hot-air-balloon': 'a hot air balloon with basket',
    'space-shuttle': 'a space shuttle orbiter, nose pointing left', 'saturn-v': 'a Saturn V rocket standing upright', 'iss': 'the International Space Station seen from directly above, solar arrays spread',
    'falcon-9': 'a Falcon 9 rocket standing upright', 'hubble': 'the Hubble space telescope, horizontal',
}
FRONT = {'door', 'adult-woman', 'adult-man', 'toddler', 'basketball-player', 'human-hand', 'football-goal', 'tennis-net', 'stop-sign', 'phone-box',
         'refrigerator', 'washing-machine', 'microwave', 'tv-55', 'laptop', 'upright-piano', 'sofa', 'eyeglasses', 'traffic-light', 'basketball-hoop'}
TOP = {'keyboard', 'pizza', 'dinner-plate', 'iss'}

def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else HERE / 'batch-04.json')
    everything = '--all' in sys.argv
    have = {p.stem for p in (HERE / 'lib').glob('*.svg')}
    items = []
    for r in csv.DictReader(open(ROOT / 'data' / 'curated.csv', encoding='utf-8')):
        if r['category'] == 'animals' or (r['id'] in have and not everything):
            continue
        sid = r['id']
        subject = SUBJECT.get(sid, 'a ' + r['name'].split('(')[0].strip().lower())
        vehicle = r['subcategory'] in ('vehicles', 'space') and r['dimension'] == 'length'
        if sid in TOP: view = 'top view'
        elif sid in FRONT: view = 'front view'
        elif vehicle: view = 'side elevation blueprint drawing'
        else: view = 'side view'
        it = {'id': sid, 'subject': subject, 'view': view}
        if vehicle: it['extra'] = BLUEPRINT
        items.append(it)
    out.write_text(json.dumps(items, indent=1, ensure_ascii=False), encoding='utf-8')
    print(f'{len(items)} items -> {out}')

if __name__ == '__main__':
    main()
