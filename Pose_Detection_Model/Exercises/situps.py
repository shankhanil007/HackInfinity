import cv2
import mediapipe as mp
import numpy as np
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

count = 0;
flag = 0;
   
cap = cv2.VideoCapture(0)
   
# Check
if (cap.isOpened()== False): 
  print("Error opening video  file")
   
with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    while(cap.isOpened()):

      ret, frame = cap.read()

      if ret == True:

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False

        # Make detection
        results = pose.process(image)

        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        try:
            landmarks = results.pose_landmarks.landmark
            
            shoulder = (landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y)*100
            if shoulder<50 and flag == 1:
                flag = 0;
                count += 1;
                print(count)
            
            elif shoulder>=75:
                flag = 1;
            
                       
        except:
            pass
        
        
        
        cv2.rectangle(image, (200,100), (400,300), (255,0,0), 2)
        
        cv2.rectangle(image, (0,0), (225,73), (245,117,16), -1)
        
        cv2.putText(image, 'COUNT', (15,12), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 1, cv2.LINE_AA)
        cv2.putText(image, str(count), 
                    (10,60), 
                    cv2.FONT_HERSHEY_SIMPLEX, 2, (255,255,255), 2, cv2.LINE_AA)
        
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                                mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=2), 
                                mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2) 
                                 )               
        cv2.imshow('Mediapipe Feed', image)

        # Press Q on keyboard to  exit
        if cv2.waitKey(25) & 0xFF == ord('q'):
          break

      else: 
        break

    cap.release()
    cv2.destroyAllWindows()
