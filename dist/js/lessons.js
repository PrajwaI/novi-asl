export const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const content = {
 A:['Make a gentle fist.','Curl all four fingers into your palm.','Rest your thumb upright along the side of your index finger.','Keep your palm facing the camera.'],
 B:['Four fingers, standing together.','Extend your four fingers straight up and keep them together.','Fold your thumb across your palm.','Keep your palm facing forward.'],
 C:['Shape a little letter C.','Curve all four fingers together.','Curve your thumb below them, leaving a rounded gap.','Turn your hand slightly so the C shape is visible.'],
 D:['One finger points up.','Extend your index finger straight up.','Touch your thumb to your middle fingertip; curl your other fingers.','Face your palm forward.'],
 E:['Bring your fingertips down.','Bend all four fingers toward your palm.','Fold your thumb under your curled fingertips.','Keep the shape compact and your palm forward.'],
 F:['Make a small circle.','Touch your index fingertip to your thumb.','Extend your middle, ring and little fingers.','Keep those three fingers gently separated.'],
 G:['A little space between two fingers.','Extend your index finger sideways.','Extend your thumb parallel to it, leaving a small gap.','Curl your other three fingers.'],
 H:['Two fingers point sideways.','Extend your index and middle fingers together.','Point them sideways with your palm angled inward.','Curl your ring and little fingers; tuck your thumb.'],
 I:['Let your little finger stand tall.','Make a fist with your index, middle and ring fingers.','Extend your little finger straight up.','Rest your thumb across your curled fingers.'],
 J:['Draw a J with your little finger.','Begin with the I handshape: little finger extended.','Move your little fingertip down, then curve inward and upward.','Trace the letter J from your own perspective.'],
 K:['Two fingers and a thumb.','Extend and separate your index and middle fingers.','Place your thumb between them, against your middle finger.','Keep your ring and little fingers curled.'],
 L:['Make an L with your hand.','Extend your index finger straight up.','Extend your thumb sideways at a right angle.','Curl your middle, ring and little fingers.'],
 M:['Tuck your thumb under three fingers.','Lay your thumb across your palm.','Fold your index, middle and ring fingers over your thumb.','Your thumb tip sits between your ring and little fingers.'],
 N:['Tuck your thumb under two fingers.','Lay your thumb across your palm.','Fold your index and middle fingers over it.','Your thumb tip sits between your middle and ring fingers.'],
 O:['Bring your fingertips together.','Curve your four fingers toward your thumb.','Touch all your fingertips to your thumb to form an O.','Turn your hand slightly to show the rounded opening.'],
 P:['Turn a K downward.','Start with the K handshape.','Rotate your wrist so your middle finger points down.','Keep your thumb against your middle finger.'],
 Q:['Turn a G downward.','Extend your index finger and thumb, with a small gap.','Point both down toward the floor.','Keep the other three fingers curled.'],
 R:['Cross your fingers.','Extend your index and middle fingers.','Cross your middle finger over your index finger.','Curl the remaining fingers and hold them with your thumb.'],
 S:['Make a closed fist.','Curl all four fingers firmly into your palm.','Place your thumb across the front of your fingers.','Keep your palm facing forward.'],
 T:['Let your thumb peek through.','Make a fist with your thumb inside.','Place the thumb tip between your index and middle fingers.','Keep your other fingers curled.'],
 U:['Two fingers, side by side.','Extend your index and middle fingers straight up.','Keep the two fingers touching.','Curl the rest and hold them with your thumb.'],
 V:['Open your two fingers.','Extend your index and middle fingers straight up.','Separate them into a V.','Curl the remaining fingers and tuck your thumb.'],
 W:['Three fingers spread wide.','Extend your index, middle and ring fingers.','Separate them to make a W.','Hold your little finger down with your thumb.'],
 X:['Hook your index finger.','Make a fist and raise your index finger.','Bend the index finger into a hook.','Keep your thumb folded across the other fingers.'],
 Y:['Thumb and little finger out.','Extend your thumb sideways and little finger upward.','Curl your index, middle and ring fingers.','Keep your palm facing forward.'],
 Z:['Draw a Z with your index finger.','Extend your index finger and curl the others.','Trace a horizontal line, a diagonal down, then another horizontal line.','Trace the letter Z from your own perspective.']
};
export const LESSONS = Object.fromEntries(ALPHABET.map(letter => [letter, {letter,title:content[letter][0],steps:content[letter].slice(1),dynamic:'JZ'.includes(letter),supported:!'JZ'.includes(letter)}]));
export const STATIC_LETTERS = ALPHABET.filter(l => LESSONS[l].supported);
export const WORDS = ['HELLO','LOVE','YES','CAT','DOG','SUN','MILK','BOOK','THANKS','APPLE'];
