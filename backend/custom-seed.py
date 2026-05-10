import os
import random
from datetime import date, datetime, time, timedelta
from sqlmodel import Session, select
from database import engine
from models import Patient, TherapySession
from faker import Faker

fake = Faker("en_US")
Faker.seed(42)
random.seed(42)


def flush_db(session: Session):
    for ts in session.exec(select(TherapySession)).all():
        session.delete(ts)
    for p in session.exec(select(Patient)).all():
        session.delete(p)
    session.commit()


transcripts_templates = [
    # 1. Work stress
    """T: Good morning, how are you feeling today? Have you noticed any differences compared to last week regarding tension at work?
P: Good morning. Yes, I have to say this week has been a bit of a nightmare. The workload has increased, and I found myself working overtime almost every day. I just can't switch off.
T: I understand. When you say you can't switch off, do you mean your thoughts, or is there a physical sensation as well?
P: Both. Physically, my shoulders are always tense, and at night I have trouble falling asleep because I keep thinking about the emails I haven't answered. I feel guilty if I'm not always available.
T: Where do you think this guilt comes from? Is it your expectation or a real pressure from the company?
P: A bit of both. My boss expects me to reply immediately, but it's also me not wanting to seem less efficient than others. I always have this fear of being judged or losing my job.
T: Have you ever tried setting clear boundaries? For example, not checking emails after a certain hour?
P: I tried, but after ten minutes, anxiety builds up, and I just have to look at my phone. It's stronger than me. It feels like if I don't have everything under control, a disaster will happen.
T: Let's analyze this "disaster." What catastrophic thing could happen if you answered an email the next morning instead of at 10 PM?
P: Rationally, I know nothing serious would happen. Maybe a small scolding, or maybe not even that. But emotionally, I experience it as a total failure, as if I'm proving I'm not up to the task.
T: Let's work on this distance between rationality and emotion. I'd like us to try a small experiment: tonight, put your phone in another room for an hour. How does that sound?
P: It already gives me anxiety just thinking about it, but I want to try. I know I can't go on like this, I'm exhausted, and my family is starting to suffer from it. Last night, I snapped at my wife for no reason, I was just too tense.""",
    # 2. Relationships and Communication
    """T: How have the past few days been with your partner? Did you have a chance to talk about what we discussed?
P: I tried, but we always end up arguing. I feel like he doesn't really listen to me. Every time I try to explain how I feel, he takes it as a personal attack and gets defensive.
T: Give me an example of how you usually start these conversations.
P: Well, the other night I told him I'm tired of always having to think about everything at home. I pointed out that if I don't do the groceries, the fridge stays empty.
T: And how did he react?
P: He raised his voice, saying he works too and is tired. From there on, it became a mess, we brought up old arguments from months ago and went to bed without talking.
T: Let's notice the way the issue was raised. You used phrases like "I always have to think about everything." This kind of phrasing can trigger a defensive attitude. Have you ever tried using "I" messages, talking about your feelings rather than what he does or doesn't do?
P: You mean something like "I feel overwhelmed"?
T: Exactly. When we say "I feel tired and could use some help," we shift the focus from the accusation to the need. Do you think he would react differently?
P: Maybe yes. He's not a bad person, I think he feels under pressure too. But it's so hard to change how we communicate after years of doing it this way. It's become an automatism.
T: It's true, communication patterns become deeply rooted over time. It requires conscious effort to change them. We could do a little role-playing on this: how could you ask him for help with groceries using "I messages"?
P: I could tell him: "Honey, I've been really tired after work lately. It would help me a lot if you could handle the groceries for this week. How does that sound?".
T: That sounds like a great approach. How do you feel about the idea of saying those exact words?
P: It makes me feel less angry and more vulnerable, but maybe that's exactly what's needed.""",
    # 3. Grief and Loss
    """T: How have you been feeling these past few days? The anniversary of your mother's passing was yesterday, right?
P: Yes, it was yesterday. It was a very heavy day. I cried almost the whole time. I thought I was doing better, a year has passed, I thought the pain would have eased a bit, but instead, it felt like I was back to square one.
T: The grieving process is never linear. Significant dates, like anniversaries, are often catalysts that bring intense emotions to the surface. It doesn't mean you're back to square one.
P: But I feel so weak. My friends tell me I should move on, that she wouldn't want to see me so sad. And I feel guilty because I can't help being sad.
T: Being told to "move on" can be very invalidating, even if said with good intentions. Grief doesn't have an expiration date. What do you miss the most right now?
P: I miss being able to call her in the evening. It was our ritual. Every time I get home from work, I pick up my phone, and then I remember she's not there anymore. That moment of realization, every single time, feels like a stab.
T: It's an enormous void. That routine was part of your daily structure. Have you thought about how you could honor that evening moment differently, maintaining a symbolic connection with her?
P: I don't know. Sometimes I talk to her out loud in the car while driving home. It makes me feel a bit ridiculous, but somehow it helps me release tension.
T: There is absolutely nothing ridiculous about that. Talking to those we've lost is a very healthy way to keep the inner bond alive. Could you try writing those conversations down? A sort of diary addressed to her.
P: Maybe I could try. I've always liked writing. Sometimes I'm afraid I'll forget her voice, you know? I close my eyes and try to remember it, but it slips away.
T: That's a common fear. Memories change shape over time, but the impact she had on your life, the values she passed on to you, those remain. What did you usually talk about during those calls?
P: Everything and nothing. I would tell her office gossip, and she would talk about her plants. It was such a comforting normalcy. I think I really miss that feeling of having a safe place where I didn't have to pretend to be strong.""",
    # 4. Social Anxiety
    """T: Did you have a chance to practice the exercise we talked about last time? The one about asking a colleague a question during the coffee break?
P: Unfortunately, no. Thursday there was the perfect opportunity, we were all in the break room. But as soon as I thought about opening my mouth, I felt my heart beating wildly and started sweating. In the end, I pretended to get a call and escaped to the bathroom.
T: I appreciate your honesty in telling me. Anxiety took over. What thoughts were going through your mind at that moment, right before you ran away?
P: I was thinking: "If I say something stupid, they'll make fun of me," "Everyone will notice my voice is trembling," "Better stay quiet so I don't risk making a fool of myself."
T: And how true did these predictions feel to you at that moment, from 0 to 100?
P: 100. I was absolutely convinced it would end badly.
T: Let's try to look at the evidence. In the few times you managed to speak in similar situations in the past, how many times did people openly make fun of you?
P: Never. No one has ever laughed in my face. Maybe someone once didn't pay much attention to me, but no one mocked me.
T: So there's a discrepancy between what your mind predicts and what actually happened in the past. The problem with avoidance, like escaping to the bathroom, is that it prevents you from discovering that your fears are exaggerated.
P: I know, I understand the logic, but physically it's unbearable. I feel like passing out. I can't control my body's reactions.
T: We can't control physiological arousal by blocking it, but we can learn to tolerate it. If instead of running away you had waited one more minute, just feeling your heart beat, what would have happened?
P: Maybe I really would have passed out?
T: It's very rare to pass out from a panic attack linked to social phobia because blood pressure usually rises, it doesn't drop. We could try a very gradual exposure. Maybe not asking a question, but just saying "good morning" while making eye contact.
P: Just "good morning"? Without having to add anything else?
T: Exactly. The goal isn't to become the life of the party overnight, but to teach your brain that social interaction isn't a deadly threat. Are you willing to try this smaller step?""",
    # 5. Panic Attacks and Agoraphobia
    """T: How went the traveling this week? Did you take the subway?
P: Only once, for three stops, and I wasn't alone. But it was terrible. I was standing near the door, looking out the window and praying it wouldn't get stuck in the tunnel. When it stopped at the next station, I got off immediately, even though it wasn't my stop.
T: The fact that you got on is still an important success, don't minimize it. What pushed you to get off earlier than planned?
P: I felt this heat rising from my chest to my neck, and the feeling of not being able to breathe. I thought: "Here we go again, I'm about to have a heart attack or go crazy." The need for fresh air was absolute.
T: You interpreted the physical symptom (the heat and shortness of breath) as an imminent danger. When you got off and stepped out into the open air, what happened to the symptoms?
P: They decreased within five minutes. But I was exhausted, I had to call a taxi to get home.
T: The relief you felt by getting off confirmed to your mind that the subway is dangerous and that escaping saved you. This is the mechanism that keeps agoraphobia alive. We need to break this cycle.
P: But how can I if I feel like dying?
T: By learning not to flee when the panic is at its peak. We've talked about this: a panic attack has a curve, it rises to a peak and then physiologically goes down. If you flee during the climb, you never experience the spontaneous descent in that situation.
P: And what if it doesn't go down? What if I keep feeling terrible until I faint?
T: A panic attack consumes a lot of energy, the body can't sustain it indefinitely. It burns itself out. Next time, if it happens, I'd like you to try using the diaphragmatic breathing technique without getting off.
P: I can try. It's just that at that moment the terror is so blinding that I forget everything. I forget the breathing, I forget what we discuss here, I just want to run away.
T: We can write the instructions on a small piece of paper to keep in your wallet, or record a voice message to listen to. Something that acts as an "anchor" when the anxiety rises.
P: I like the idea of the audio. Maybe your voice, or even my own voice repeating logical things to me, could help me not lose touch with reality.""",
    # 6. Self-Esteem and Imposter Syndrome
    """T: Last session we talked about your new promotion. How are the first few days in the new management role going?
P: A disaster, at least in my head. I'm just waiting for someone to walk into my office and say, "We made a mistake, you're not the right person, go back to your old job."
T: The famous imposter syndrome. What is this belief of not being adequate based on?
P: Everyone around me seems so confident. They always know what to say in meetings, they use perfect technical terms. I, on the other hand, feel like a little girl on her first day of school pretending to be an adult. I put in double the effort to prepare for every single thing so I don't get caught off guard.
T: This over-preparing is a typical compensation strategy. It works, because you're never caught unprepared, but it exhausts you. Did they give you this promotion by chance?
P: They say I demonstrated excellent organizational and leadership skills in previous projects. But I always think it was just luck, or that the project was easy.
T: There's a tendency to minimize your successes by attributing them to external factors, like luck, and to maximize your limitations. If a colleague of yours had achieved your same results, would you say they were lucky?
P: Absolutely not, I'd think they are very good and deserve it all.
T: Do you see the double standard? You're much harsher on yourself than on anyone else. Where do you think this severity comes from?
P: Probably from the way I was raised. My parents never celebrated high grades, they always said "It's your duty." If I got a 9, they asked why I didn't get a 10.
T: This perfectionism has been internalized. Your inner voice today is a reflection of those demands. How can we start responding to this voice?
P: Maybe I should learn to recognize that I have real skills. But it's so hard to seriously believe it.
T: Let's start with objective facts. This week, every time you feel inadequate, write down in a notebook one thing you did well or a problem you successfully solved at work.
P: A success diary. I could do that. In fact, yesterday I resolved a conflict between two team members without making a big deal out of it. Maybe I should note things like that.""",
    # 7. Hypochondria and Health Anxiety
    """T: How many times this week did you search for your symptoms on the internet?
P: Unfortunately, I gave in. At least five or six times. I felt a slight tingling in my left arm and in an instant, I was convinced I had early-stage multiple sclerosis. I spent all of Wednesday night reading medical forums.
T: And after reading the forums, did your anxiety decrease or increase?
P: At first, it seems to subside because I look for confirmation that it's nothing serious. But then I read stories of people whose diagnosis was missed for years, and the anxiety explodes again. Then I started constantly checking the sensitivity of my arm, pinching myself.
T: It's the classic vicious cycle of health anxiety. Continuous checking (pinching yourself) and seeking reassurance (internet or doctors) keep the problem alive. By doing this, you send a message to your brain that there really is an emergency.
P: I know, I realize it's irrational. I had all the possible check-ups last year, and they told me I'm as healthy as a horse, and that my symptoms are psychosomatic. But there's always that thought: "What if this time it's true?".
T: That "what if?" is the bait for anxiety. We cannot have 100% absolute certainty of anything in life. We have to learn to tolerate a small percentage of uncertainty. What was our agreement regarding the internet?
P: No Google for physical symptoms. I know. But it's like an addiction, I have an uncontrollable urge to search.
T: To manage the urge, we need to insert a gap between the stimulus (the tingling) and the response (the search). Next time, when you feel the urge to Google, set a timer for 30 minutes. Tell yourself: "I will search, but in 30 minutes."
P: And what do I do during those 30 minutes?
T: You engage in an activity that absorbs your attention. Read a book, cook, call a friend. The goal is to let the wave of compulsive urgency pass. Often, after 30 minutes, the anxiety has dropped enough for you to choose not to search.
P: It might work. I've noticed that if I manage to distract myself, I sometimes forget about the symptom until the next day.
T: Exactly. The symptom loses its importance if you don't fuel it with focused attention. Are you willing to try the 30-minute rule this week?""",
    # 8. Eating Disorders and Body Image
    """T: Did you fill out the food and emotion diary as we agreed?
P: Yes, I brought it. But I'm very ashamed. There were two binge-eating episodes. One on Tuesday evening and one yesterday.
T: No judgment in this room. The important thing is to look at the data with curiosity, not criticism. Let's analyze Tuesday evening. What happened before the binge?
P: I came home from work, feeling very lonely. I opened Instagram and saw photos of my friends' vacations. All thin, beautiful, perfect. I felt a knot in my stomach, looked in the mirror, and felt disgusted.
T: Was the prevailing emotion at that moment sadness, loneliness, or disgust toward yourself?
P: A mix. Above all, I felt unlovable. In that moment, I opened the pantry to eat a cookie, and I couldn't stop. When I eat like that, my brain shuts off. It's like I'm anesthetized.
T: The food worked perfectly in that moment: it shut down the painful emotion of feeling "unlovable." But the effect doesn't last long, does it?
P: Very little. Afterward, paralyzing guilt takes over. I hate myself even more for losing control. And then I decide that the next day I'll fast to compensate.
T: And the restriction-binge cycle begins again. If we look at the diary, on Tuesday you only had an undressed salad for lunch to "stay light." Physically, your body was starving. Combining physical hunger with emotional pain, the binge was almost inevitable.
P: So you're telling me I need to eat more during the day? But I'm too scared of gaining weight.
T: I understand the fear, but extreme restriction is the primary physiological trigger for binges. We need to regularize meals to remove the "famine" signal from the body. At the same time, we'll work on non-food strategies to manage the feeling of loneliness.
P: Like what? I don't feel like going out with anyone when I feel like that.
T: Something comforting but unrelated to eating. A hot bath, watching a TV series that reassures you, petting your cat. We need to create a menu of self-soothing alternatives.
P: I can try that. And maybe I should stop looking at Instagram when I'm sad, it just makes me feel even worse.""",
    # 9. Obsessive Compulsive Disorder (OCD)
    """T: How is the reduction of evening checks going?
P: It's very difficult. I managed not to check the power outlets in the living room, but the front door and the kitchen stove are still an impassable block.
T: How many times do you currently check the front door?
P: From five to ten times. I lock it, go to bed. Then the thought arrives: "What if I didn't turn the key right? What if someone enters at night?". The anxiety becomes unbearable and I get up to check again.
T: And when you check, what is the goal?
P: To be 100% sure it's locked. To hear a reassuring click in my mind.
T: But does that click ever arrive?
P: Sometimes yes, after many attempts. Sometimes no, and I end up falling asleep out of exhaustion around three in the morning. I'm exhausted, my life is held hostage by these rituals.
T: OCD demands absolute certainties that real life cannot offer. We need to learn to tolerate doubt. This week I'd like us to try "response prevention."
P: Meaning not checking at all? I can't do it, that's too extreme for me right now.
T: We don't start with "not at all." We start by reducing the number or changing the form. You could lock the door just once, take a picture with your phone, and go to bed. If doubt arises, look at the photo instead of getting up.
P: But my brain will say: "The photo is old, or maybe after taking it you accidentally reopened the door."
T: It's true, the obsessive mind will always find a "what if." The goal of the photo isn't to calm the OCD forever, but to introduce a detour in the ritual to break the automatism. Once you accept this doubt, the anxiety will physiologically decrease.
P: It's exhausting. But I understand that continuing to give in to the checks only strengthens the monster. I'll try the photo, it seems like a compromise I can attempt.
T: It's an excellent step forward. You have to remember that OCD is like a bully: the more you agree with it, the more it will demand from you in the future. Every little rebellion against its rules is a victory.""",
    # 10. Trauma and PTSD
    """T: Last time we talked about the flashbacks related to the accident. How have they been these past few days?
P: Frequent, especially at night. Yesterday it happened during the day too. I was at the supermarket, and I heard a loud noise, like something metallic falling. I froze completely, my breath stopped, and for a moment I smelled the burning smell of the car again.
T: An auditory trigger sparked the traumatic memory. When you froze, how real did the sensation of being back there feel?
P: Totally real. I knew I was in the supermarket, but my body was trapped in the car. It took me a good ten minutes to come back to my senses. I burst into tears in the parking lot.
T: It's an understandable physiological reaction of a nervous system that perceives a past threat as present. When it happens, it's important to "re-anchor" yourself to the here and now. Did you try using your senses as I suggested?
P: I tried the "5-4-3-2-1" technique, the one where you name five things you see, four you touch, etc. It worked a little bit, it helped me regain contact with the floor under my feet.
T: It's an excellent tool. The more you use it, the more effective it will become. The traumatized brain needs tangible, sensory evidence that the danger is over, that you are safe in the present.
P: I just wish I didn't have these reactions anymore. I feel defective. People around me don't understand, they say "it's been a year, you should have put it behind you by now."
T: Trauma isn't erased with time, but it becomes integrated. Right now, your amygdala is in a constant state of hyper-alertness to protect you, but it misfires the alarm signals. With the EMDR we'll start soon, we'll work precisely to desensitize these painful memories.
P: I hope it works. Sometimes I avoid going out in the car with friends just so I don't make a scene or look crazy. I'm restricting my life.
T: That's the avoidance we were talking about. Short-term avoidance gives you safety, but long-term it shrinks your living space. Don't demand too much of yourself, you are on a healing journey, and it takes courage.
P: I'll commit to the grounding exercises this week, I want to try to regain some control.""",
    # 11. Anger and Impulse Management
    """T: Let's review the episode from Tuesday at the office. What made you explode like that during the meeting?
P: My colleague interrupted me for the umpteenth time while I was presenting the report. He always does it, with that smug little smile. I just lost it. I slammed my hands on the table and yelled at him to shut up. In front of everyone.
T: Right after you did it, how did you feel?
P: For two seconds, omnipotent. A total sense of liberation. But right after, when silence fell over the room and everyone stared at me in shock, I felt unspeakable shame. Now I'm risking an official warning.
T: Anger often works like that: immediate relief followed by long-term harmful consequences. Let's rewind the tape. Before the explosion, were there any physical signs of activation?
P: Yes, my heart was beating fast and I felt my neck muscles tighten. I was gripping my pen so hard I almost broke it. But in that moment, I don't pay attention to it.
T: That's the key point. Those signals are your yellow traffic lights. When anger reaches the red light, the prefrontal cortex (the rational part) "shuts down" and you act purely on impulse. We need to intervene at the yellow light.
P: And what should I do? If someone disrespects me, I can't just take a deep breath and smile like an idiot.
T: Of course not. It's not about repressing anger or submitting passively, but channeling it assertively instead of aggressively. When you notice the physical signs, you can take a pause, even just take a sip of water. And then firmly say: "Please don't interrupt me, I haven't finished speaking."
P: It sounds easy in words, but in that moment I just see red.
T: It takes practice, like training a muscle. We can work on early identification of triggers. What are the thoughts that make you "see red"?
P: The thought that no one respects me, that everyone tries to walk all over me and belittle my work. If I don't defend myself by attacking first, they will destroy me.
T: That's a very strong belief. Does it perhaps stem from past experiences where you truly felt threatened and defenseless?
P: Yes, my father was an authoritarian guy, at home things were done his way, and whoever showed weakness got overpowered.""",
    # 12. Specific Phobia (Flying)
    """T: Have you set a date for your flight to London, or are you still procrastinating?
P: I'm procrastinating. Just the thought of buying the ticket gives me nausea. My partner would really love to go, but I can't imagine getting into that metal tube suspended in nothingness.
T: What's the worst image that comes to mind when you think of flying?
P: That the plane crashes, obviously. I imagine heavy turbulence, oxygen masks dropping, panic on board. It's completely out of my control. At least when driving a car, I'm the one at the wheel.
T: The need for control is central to this phobia. There's a very common cognitive distortion: we overestimate the danger of situations where we lack direct control (the plane) and underestimate controllable ones (the car), even though statistically flying is much safer.
P: I know that rationally, I've read all the statistics. But when I'm there, sitting in that seat, logic vanishes. I'm afraid of having a panic attack at 30,000 feet and not being able to escape.
T: That's anticipatory anxiety, and it's often tied to the fear of fear itself. The fear of having a panic attack becomes the primary problem. Have you ever considered taking one of the courses offered by airlines for fear of flying?
P: They've recommended it to me. They explain the noises the plane makes, the physics of flying. Maybe understanding what happens on a technical level could reassure me.
T: It helps to decatastrophize. An unusual sound to you is a deadly alarm, to the pilot it's just the landing gear retracting. Knowledge reduces uncertainty.
P: But I still have to be the one to actually buy the ticket. Maybe we could establish a gradual plan? I don't know, watching videos of takeoffs?
T: Excellent idea, it's called systematic desensitization. This week, your task is to watch videos of takeoffs on YouTube for 10 minutes a day. You must note your anxiety level from 0 to 10 before, during, and after. How does that sound?
P: Doable. I can always close the video if I feel too sick.""",
    # 13. Procrastination and Planning Difficulties
    """T: How did it go with writing your thesis these past few days? Were you able to follow the breakdown into small blocks we agreed on?
P: A disaster. The intention was there, I even woke up early. But then I thought I had to clean my desk first, then organize files on my computer... and soon it was evening. In the end, I wrote half a page and I feel guilty.
T: You got lost in preparatory activities. It's a classic procrastination avoidance mechanism. What did you feel when you sat down in front of the blank page?
P: A sense of oppression, as if I had to climb Mount Everest. It felt impossible to write something intelligent and well-crafted. The more I thought about it, the more I felt the need to do something simple, like cleaning, to feel productive.
T: Perfectionism paralyzes action. The anxiety of having to do everything perfectly makes starting the task so unpleasant that the brain seeks instant gratification elsewhere. We need to lower the bar of initial expectations.
P: But the thesis has to be well written.
T: Absolutely, in the end. But the first draft can, and indeed must, be imperfect. Ernest Hemingway said that "the first draft of anything is garbage." If I gave you permission to write for 20 minutes in the worst possible way, just throwing ideas down without correcting, could you do it?
P: Writing badly on purpose? That sounds weird. But it would take off a lot of pressure.
T: It's called applying the "Pomodoro technique" to a terrible draft. Set a timer for 25 minutes. During those minutes, you must write without stopping, without correcting typos, without judging your syntax. When the timer rings, you stop. The goal is not quality, it's breaking the wall of inertia.
P: I think I can do that. It's like removing the importance from the task to trick my brain.
T: Exactly, we're tricking the emotional block. Often, once you start, positive inertia carries you forward. We want to defeat the initial difficulty of activation.
P: I have to try. This feeling of being stuck and not accomplishing anything is deeply depressing me; I feel like a total failure compared to my classmates.""",
    # 14. Family Boundary Issues
    """T: Last time we discussed saying "no" to your mother regarding Sunday lunch. Did you manage to do it?
P: I tried. I told her that this weekend my husband and I wanted to stay home and rest. She made a tragedy out of it. She said we never see her, that she's getting old, and that we exclude her.
T: And how did you feel faced with those words?
P: Like a horrible daughter. The guilt completely overwhelmed me. In the end, I told her we would go, even if just for an hour. I caved, as always.
T: Emotional blackmail is powerful. Your mother pushed the guilt buttons to get what she wanted, and it worked. What would have happened if, instead of caving, you had maintained your position affectionately but firmly?
P: She probably would have sulked for weeks. And she would have had my brother call me to lecture me. It's a script I know by heart.
T: Setting boundaries with people who aren't used to respecting them always generates an initial rebellion, which we call an "extinction burst." They escalate the behavior before accepting the new rule. You have to be ready to tolerate her sulking without taking on the burden of her emotions.
P: I don't know if I'm strong enough. It's as if her well-being depends entirely on me.
T: That is exactly the illusion we need to dismantle. You are responsible for your behavior toward your mother, not for your mother's emotions. If you say "no" with kindness and respect, you've done your part. How she reacts is her problem, not yours.
P: That sounds harsh.
T: It sounds differentiated. As long as you avoid setting boundaries to avoid feeling guilty, you will accumulate resentment toward her. And resentment damages relationships much more than a "no". Let's try constructing an assertive sentence for next time.
P: Like: "Mom, I know Sunday lunch means a lot to you and I love you, but this weekend I need to rest at home. We'll see each other next weekend"?
T: Perfect. It validates your mother's feelings but holds the boundary firm. The hard part will be not adding extra justifications or apologies.""",
    # 15. Insomnia and Nighttime Hyperarousal
    """T: How's your sleep going? Are you following the rule of getting out of bed if you can't fall asleep within twenty minutes?
P: I try, but sometimes I'm so physically exhausted that the idea of getting up feels too heavy. I stay in bed tossing and turning, looking at the clock, calculating how many hours I have left before the alarm goes off, and my anxiety grows exponentially.
T: Looking at the clock is the worst enemy of anyone suffering from insomnia. It turns sleep from a natural process into a mathematical performance. "If I fall asleep now, I'll sleep 4 hours and 12 minutes... I'll be a wreck tomorrow."
P: That's exactly what I think! And the more I think about it, the faster my heart beats and my brain seems to light up like a pinball machine.
T: The bed is becoming a battlefield instead of a place of rest. That's why getting up is crucial. If you stay in bed feeling frustrated, your brain associates the mattress with anxiety and effort. We need to rebuild the bed-sleep association.
P: And when I get up, what should I do? Often I go to the couch and scroll through Instagram, but I guess that doesn't help.
T: Absolutely not, the blue light from screens inhibits melatonin production. You should do a boring, relaxing activity in dim light. Read a book that isn't too gripping, do a puzzle, listen to relaxing music.
P: And I only go back to bed when I'm sleepy?
T: Only when your eyelids feel heavy. If you go back and don't fall asleep again, you get up again. Even if you have to do it five times in one night. Your body needs to relearn that the bed is only for sleeping. Did you turn or hide the alarm clock as suggested?
P: Not yet, I'm afraid it won't ring.
T: Let's put the phone face down or turn the clock toward the wall. The alarm will still ring, but you won't be able to monitor the passing time. This is a non-negotiable "homework" for this week.
P: Okay, I'll hide the clock. It's nerve-wracking facing the day being constantly exhausted. My performance at work is plummeting.
T: Insomnia creates a vicious cycle: the fear of the consequences at work the next day causes you anxiety at night, which in turn prevents you from sleeping. We will work on both fronts.""",
    # 16. Life Stage Transition
    """T: Graduation was two months ago now. How do you feel in this new "empty" phase before job hunting?
P: I feel lost. For five years my identity has been "the student." I had clear goals: pass exams, graduate. Now that I've finished, I thought I'd feel free, but instead, I feel like I'm falling into a void.
T: Transition anxiety. The external structure that organized your time and gave you a sense of direction has vanished, and now you have to create an internal one. It's one of the biggest challenges.
P: My friends all seem to know what they want to do. Some are sending out resumes, some are doing master's programs abroad. I wake up late, spend my days thinking about what to do, and end up doing nothing. And I feel guilty for not being productive.
T: Have you ever considered the idea of intentionally allowing yourself a period of rest, guilt-free? A sort of active transition before diving into the job market?
P: It feels like a waste of time. I have to find a job, society demands this.
T: Of course, but sending out resumes in a panic and without a clear direction rarely leads to satisfying choices. What if this "empty" period wasn't a mistake, but a space to get to know yourself better outside the academic environment?
P: It would be nice to experience it like that, but my parents are starting to make snide remarks about me always being at home. That puts a pressure on me that paralyzes me even more.
T: It's important to communicate with them. You could explain that you've decided to take, for example, a four-week break to recover from the strain of the thesis and clearly define your goals. Setting a clear timeframe reduces their anxiety and yours.
P: Setting a date... yes, that might help. It would give me permission to rest without feeling judged as a permanent slacker.
T: Let's create a small temporary routine so you don't slip into apathy. Wake up at a set time, dedicate an hour to a hobby or sports, and a short time to exploring your interests for the future. No resumes for a month, just exploration.""",
    # 17. Social Isolation
    """T: In recent weeks we've talked about your feeling of loneliness in this new city. Have you tried frequenting any new environments?
P: I went to the gym a couple of times, but I do my exercises and leave. Everyone already has their friend group, headphones in, it seems impossible to strike up a conversation with anyone.
T: The gym, especially in big cities, is often a place where people seek isolation rather than socialization. What other interests do you have that might lend themselves better to structured interaction?
P: I really used to like board games, years ago I had a regular group in my hometown. And photography too, even though I'm an amateur.
T: Both are excellent ideas. Photography groups or board game clubs are "social facilitators." People attend specifically to interact around a shared activity, breaking down the barrier of starting a conversation out of nowhere.
P: I looked up some events online, but the idea of showing up alone at a place where I don't know anyone blocks me. I always think: what if I look like a desperate loser looking for friends?
T: That's a very common cognitive distortion. In reality, most people admire those who have the courage to show up alone at a new event. Try to imagine being in that club already and seeing a new guy arrive alone. What would you think of him?
P: I'd think: "Good for him, glad he came, I hope he has a good time." I would never think he's a loser.
T: Exactly, let's apply the same benevolence to ourselves that we apply to ourselves. This week I'm asking you to identify a specific event (photography or board games), check the schedule, and go. I'm not asking you to make lasting friendships, just to be present for an hour.
P: I just have to resist the urge to cancel everything at the last minute. When the time gets closer, I always find a thousand excuses to stay home safe on the couch.
T: We know that avoidance reduces anxiety in the short term but strengthens the cage of loneliness in the long term. Let's establish an "action plan": how will you behave on Thursday evening when your mind starts suggesting you shouldn't go?""",
    # 18. Financial Stress
    """T: How do you feel talking about it more directly today? Financial matters are often a difficult taboo to break.
P: I am deeply ashamed. Having debt at my age makes me feel like a failure. I don't sleep at night thinking about the installments to pay, I open letters from the bank with my heart in my throat. I've stopped going out to dinner with friends, making up absurd excuses.
T: Keeping the secret fuels the shame and the sense of isolation. Who have you talked to about this situation so far, besides me?
P: No one. I could never tell my parents, they would worry to death, or worse, judge me for spending beyond my means in the past. And I don't want to show this side of me to my partner, she needs to think I'm a stable person.
T: This burden is too heavy to carry alone. The chronic stress you are experiencing leads to constant mental fatigue. Furthermore, hiding things from your wife creates emotional distance in the couple. Have you noticed changes in your relationship?
P: Yes, I'm grumpier, more distant. She asks me if there's another woman or if I don't love her anymore. And I don't know what to answer without revealing the truth.
T: Ironically, to protect her from financial worry, you're creating a relationship crisis that is perhaps much more painful for her. Practical problems can be solved with repayment plans, a lack of trust is harder to repair.
P: I know, but the moment of talking about it terrifies me. I'm afraid of her reaction. She might leave me for my irresponsibility.
T: It's a possibility, the fear is legitimate. But a strong union is based on facing difficulties together. We could prepare the speech together. You don't have to dump the problem on her, but present the situation in an adult way, showing that you already have a plan to resolve it.
P: Maybe if I come in saying: "I made some mistakes in the past, here's the debt amount, and here's how I intend to pay it off," it might be less traumatic.
T: Exactly. Addressing the problem proactively diminishes the perception of weakness. Let's do a role-play of this conversation today, let's see what emotions emerge.""",
    # 19. Emotional Dysregulation (Borderline Traits)
    """T: Let's go over what happened this weekend. You mentioned a deep crisis on the phone.
P: Yes, Saturday night. My boyfriend didn't reply to my messages for three hours. I knew he was at a dinner with colleagues, but my mind raced. I started thinking he didn't care about me, that he was getting bored of our relationship, that maybe there was someone else.
T: And how did you act driven by these thoughts?
P: I bombarded him with calls, I must have called him like twenty times. Finally he answered, very angry, told me I was suffocating him and turned off his phone. That's when my world crashed down, I cried desperately on the floor, I felt a physical pain in my chest, an unbearable emptiness.
T: The perception of abandonment triggers extreme anguish, which leads to impulsive behaviors (the continuous calling) that, unfortunately, often end up actually pushing the other person away. What did you do to manage that acute pain?
P: I drank almost half a bottle of wine. It numbed me enough to make me crash and fall asleep. But Sunday morning the anxiety was ten times worse, mixed with guilt.
T: Alcohol is a highly dysfunctional emotional regulator in the long run. We've talked in the past about "Mindful Tolerance" and the crisis survival skills of Dialectical Behavior Therapy. In that moment of total anguish, what could you have done instead of drinking or calling compulsively?
P: I don't know, use the cold? That ice on the face thing you told me about?
T: Yes, triggering the dive reflex (TIPP skill). Plunging your face into a bowl of cold water instantly lowers your heart rate and partially resets the autonomic nervous system. It's a strong physical action that breaks the panic loop.
P: It sounds crazy, but if it helps not to destroy my relationships, I'll do it. I just have to remember it before I reach the point of no return.
T: Exactly. You need to write down the emergency protocol and stick it on your fridge. When you feel the abandonment panic rise above 70 out of 100, no phone, no relationship decisions. Only physical strategies: cold, intense exercise, or paced breathing.""",
    # 20. Difficulty Saying No (People Pleasing)
    """T: So you agreed to do this extra shift on the weekend too, giving up the trip you had planned?
P: Yes. My colleague begged me for the favor, saying he had a family problem. I couldn't bring myself to say no. And now my wife and I are fighting furiously because I had to cancel our weekend in the mountains.
T: How much did this "yes" cost you, in terms of energy and well-being?
P: A lot. I'm furious with myself, furious with my colleague who always takes advantage, and frustrated for letting my wife down again. I'm the classic "nice guy" who lets people walk all over him.
T: Let's focus on the exact moment of the request. When he asked you to cover the shift, what thought crossed your mind in that split second?
P: That if I said no, I'd cause a problem, he'd think I'm a selfish jerk, and the atmosphere in the office would become tense. The anxiety of potential conflict was too high.
T: "People pleasing" often originates as a childhood survival strategy to avoid conflicts and maintain a sense of safety. But as adults, it becomes a trap. Saying "yes" to others often means saying "no" to ourselves or those we love most, as in this case, to your wife.
P: It's very true. I avoid conflict with acquaintances and end up unloading it at home with my wife, because with her I feel safer and know she won't abandon me. It's unfair.
T: It's a painful but fundamental realization. To learn to say no, we have to build tolerance to the discomfort of other people's disappointment. Are you willing to endure a colleague being annoyed for a few days, in order to protect your family's peace?
P: Rationally yes. Emotionally I struggle. Having someone angry with me makes me feel guilty.
T: Let's start with small "no"s. The goal for this week is not to say a huge no at work, but to find three small opportunities to state your own preferences. A friend suggests a restaurant you don't like? Propose an alternative yourself. Direct small actions toward yourself."""
]


def generate_custom_data():
    with Session(engine) as session:
        flush_db(session)

        # Create 30 patients (20 active, 10 dismissed)
        patients = []
        for i in range(30):
            is_active = i < 20
            p = Patient(
                name=fake.first_name(),
                surname=fake.last_name(),
                age=random.randint(22, 65),
                condition=random.choice(
                    [
                        "Anxiety",
                        "Depression",
                        "Bipolar Disorder",
                        "Stress",
                        "Obsessive Compulsive Disorder",
                        "PTSD",
                        "Social Phobia",
                    ]
                ),
                status="Active" if is_active else "Dismissed",
                is_active=is_active,
                address=fake.address(),
                email=fake.email(),
                phone=fake.phone_number(),
            )
            session.add(p)
            session.commit()
            session.refresh(p)
            patients.append(p)

        active_patients = [p for p in patients if p.is_active]

        # Create 20 therapy sessions with max 2500 chars transcripts (no summary)
        # We have 20 transcripts templates
        past_sessions = []
        today = date.today()  # 2026-05-10

        for idx, t_text in enumerate(transcripts_templates):
            # assign to a random active patient
            p = random.choice(active_patients)
            # random past date within last 30 days
            days_ago = random.randint(1, 30)
            session_date = datetime.combine(
                today - timedelta(days=days_ago),
                time(hour=random.randint(9, 18), minute=0),
            )

            ts = TherapySession(
                patient_id=p.id,
                date=session_date.isoformat() + "Z",
                start_time=session_date.strftime("%H:%M"),
                end_time=(session_date + timedelta(minutes=50)).strftime("%H:%M"),
                approved=False,
                transcript=t_text,
                clinical_note=None,  # User requested NO summary
            )
            session.add(ts)

        # Create 10 booked therapy sessions (5 today May 10, 5 future)
        today_date_str = today.isoformat() + "Z"  # '2026-05-10T00:00:00Z'

        for i in range(10):
            p = random.choice(active_patients)

            if i < 5:
                # Today May 10
                session_date = datetime.combine(today, time(hour=9 + i, minute=0))
            else:
                # Future
                days_ahead = random.randint(1, 14)
                session_date = datetime.combine(
                    today + timedelta(days=days_ahead),
                    time(hour=random.randint(9, 18), minute=0),
                )

            ts = TherapySession(
                patient_id=p.id,
                date=session_date.isoformat() + "Z",
                start_time=session_date.strftime("%H:%M"),
                end_time=(session_date + timedelta(minutes=50)).strftime("%H:%M"),
                approved=False,
                transcript=None,
                clinical_note=None,
            )
            session.add(ts)

        session.commit()
        print("Database successfully seeded with custom requested data.")


if __name__ == "__main__":
    generate_custom_data()
