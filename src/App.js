import React, { useState, useEffect } from 'react';
import './App.css';
import { saveTeachersToDb, loadTeachersFromDb, saveScheduleToDb, loadScheduleFromDb } from './services/teacherData';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  '8:00-9:00', '9:00-10:00', '10:00-11:00', '11:00-12:00',
  '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00'
];

function App() {
  const [teachers, setTeachers] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teachersData, scheduleData] = await Promise.all([
          loadTeachersFromDb(),
          loadScheduleFromDb()
        ]);
        setTeachers(teachersData);
        setSchedule(scheduleData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);
  const [schedule, setSchedule] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    hoursPerWeek: '',
    subjects: '',
    preferredClassrooms: '',
    maxHoursPerDay: '',
    classroomHours: {},
    availableDays: [],
    availableTimeSlots: []
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e, type) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [type]: checked 
        ? [...prev[type], value]
        : prev[type].filter(item => item !== value)
    }));
  };



  const handleSubmit = (e) => {
    e.preventDefault();
    setTeachers(prev => [...prev, formData]);
    setFormData({
      name: '',
      hoursPerWeek: '',
      subjects: '',
      preferredClassrooms: '',
      maxHoursPerDay: '',
      classroomHours: {},
      availableDays: [],
      availableTimeSlots: []
    });
  };

  const handleRemoveTeacher = (index) => {
    setTeachers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectAllDays = () => {
    setFormData(prev => ({
      ...prev,
      availableDays: [...DAYS]
    }));
  };

  const handleSelectDefaultHours = () => {
    const defaultHours = TIME_SLOTS.filter(slot => {
      const startHour = parseInt(slot.split(':')[0]);
      return startHour < 14;
    });
    setFormData(prev => ({
      ...prev,
      availableTimeSlots: defaultHours
    }));
  };

  const handleClassroomHoursChange = (classroom, hours) => {
    setFormData(prev => ({
      ...prev,
      classroomHours: {
        ...prev.classroomHours,
        [classroom.trim()]: parseInt(hours) || 0
      }
    }));
  };

  const exportSchedule = () => {
    let dayHeaders = [''];
    DAYS.forEach(day => {
      dayHeaders.push(day);
      for (let i = 0; i < TIME_SLOTS.length - 1; i++) {
        dayHeaders.push('');
      }
    });

    let hourHeaders = ['Teacher'];
    DAYS.forEach(() => {
      TIME_SLOTS.forEach((_, index) => {
        hourHeaders.push(index + 1);
      });
    });

    let csvContent = dayHeaders.join(',') + '\n' + hourHeaders.join(',') + '\n';

    teachers.forEach(teacher => {
      let row = [teacher.name];
      DAYS.forEach(day => {
        TIME_SLOTS.forEach(slot => {
          const entry = schedule[day][slot].find(e => e.teacher === teacher.name);
          row.push(entry ? entry.classroom : '');
        });
      });
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teacher-schedule.csv';
    a.click();
  };

  const handleGenerateSchedule = () => {
    generateSchedule();
  };

  const handleEventClick = (event, day, slot, index) => {
    setEditingEvent({
      ...event,
      originalDay: day,
      originalSlot: slot,
      originalIndex: index,
      newDay: day,
      newSlot: slot
    });
    setShowPopup(true);
  };

  const handlePopupSave = async () => {
    if (!editingEvent) return;

    const newSchedule = { ...schedule };
    
    // Remove from original position
    newSchedule[editingEvent.originalDay][editingEvent.originalSlot].splice(editingEvent.originalIndex, 1);
    
    // Add to new position
    newSchedule[editingEvent.newDay][editingEvent.newSlot].push({
      teacher: editingEvent.teacher,
      subject: editingEvent.subject,
      classroom: editingEvent.classroom
    });
    
    setSchedule(newSchedule);
    setShowPopup(false);
    setEditingEvent(null);
    
    // Update both teachers and schedule in the database
    try {
      await Promise.all([
        saveTeachersToDb(teachers),
        saveScheduleToDb(newSchedule)
      ]);
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const handlePopupCancel = () => {
    setShowPopup(false);
    setEditingEvent(null);
  };

  const generateSchedule = async () => {
    const newSchedule = {};
    
    DAYS.forEach(day => {
      newSchedule[day] = {};
      TIME_SLOTS.forEach(slot => {
        newSchedule[day][slot] = [];
      });
    });
  
    teachers.forEach(teacher => {
      let remainingHours = parseInt(teacher.hoursPerWeek);
      const availableDays = [...teacher.availableDays];
      const availableSlots = [...teacher.availableTimeSlots];
      const maxPerDay = parseInt(teacher.maxHoursPerDay) || 8;
      const classroomHoursCounts = {};  // Track hours per classroom
      const classrooms = teacher.preferredClassrooms.split(',').map(c => c.trim());
  
      while (remainingHours > 0 && availableDays.length > 0 && availableSlots.length > 0) {
        const randomDayIndex = Math.floor(Math.random() * availableDays.length);
        const randomDay = availableDays[randomDayIndex];
        const randomSlotIndex = Math.floor(Math.random() * availableSlots.length);
        const randomSlot = availableSlots[randomSlotIndex];
        
        const hoursOnThisDay = Object.values(newSchedule[randomDay]).flat()
          .filter(entry => entry.teacher === teacher.name).length;

        if (!newSchedule[randomDay][randomSlot].length && hoursOnThisDay < maxPerDay) {
          // Try each classroom until we find one that works
          for (const classroom of classrooms) {
            classroomHoursCounts[classroom] = (classroomHoursCounts[classroom] || 0);
            
            // Check if we haven't exceeded the classroom hours limit
            if (!teacher.classroomHours[classroom] || 
                classroomHoursCounts[classroom] < teacher.classroomHours[classroom]) {
              newSchedule[randomDay][randomSlot].push({
                teacher: teacher.name,
                subject: teacher.subjects.split(',')[0].trim(),
                classroom: classroom
              });
              classroomHoursCounts[classroom]++;
              remainingHours--;
              break;
            }
          }
        }

        // If we couldn't schedule this slot, remove it from available options
        if (hoursOnThisDay >= maxPerDay) {
          availableDays.splice(randomDayIndex, 1);
        } else if (newSchedule[randomDay][randomSlot].length > 0) {
          availableSlots.splice(randomSlotIndex, 1);
        }
      }
    });
  
    setSchedule(newSchedule);
    await Promise.all([
      saveTeachersToDb(teachers),
      saveScheduleToDb(newSchedule)
    ]);
  };
  
  return (
    <div className="App">
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Teacher Name"
            required
          />
        </div>
        <div>
          <input
            type="number"
            name="hoursPerWeek"
            value={formData.hoursPerWeek}
            onChange={handleInputChange}
            placeholder="Hours per Week"
            required
          />
        </div>
        <div>
          <input
            type="text"
            name="subjects"
            value={formData.subjects}
            onChange={handleInputChange}
            placeholder="Subjects (comma separated)"
            required
          />
        </div>
        <div>
          <input
            type="text"
            name="preferredClassrooms"
            value={formData.preferredClassrooms}
            onChange={handleInputChange}
            placeholder="Preferred Classrooms (comma separated)"
            required
          />
        </div>

        {/* Add max hours per day input */}
        <div>
          <input
            type="number"
            name="maxHoursPerDay"
            value={formData.maxHoursPerDay}
            onChange={handleInputChange}
            placeholder="Maximum Hours per Day"
            min="1"
            max="8"
            required
          />
        </div>

        {/* Add classroom hours inputs */}
        {formData.preferredClassrooms.split(',').map(classroom => 
          classroom.trim() && (
            <div key={classroom.trim()} className="classroom-hours">
              <label>
                Max hours in {classroom.trim()}:
                <input
                  type="number"
                  min="0"
                  max={formData.hoursPerWeek}
                  value={formData.classroomHours[classroom.trim()] || ''}
                  onChange={(e) => handleClassroomHoursChange(classroom, e.target.value)}
                  placeholder="Max hours"
                />
              </label>
            </div>
          )
        )}

        <div className="availability">
          <h3>Available Days:</h3>
          <button 
            type="button" 
              onClick={handleSelectAllDays}
              style={{ marginBottom: '10px' }}
            >
              Select All Days
          </button>
          {DAYS.map(day => (
            <label key={day}>
              <input
                type="checkbox"
                value={day}
                checked={formData.availableDays.includes(day)}
                onChange={(e) => handleCheckboxChange(e, 'availableDays')}
              />
              {day}
            </label>
          ))}
        </div>

        <div className="availability">
          <h3>Available Time Slots:</h3>
          <button 
            type="button" 
            onClick={handleSelectDefaultHours}
            style={{ marginBottom: '10px' }}
          >
            Select 8:00-14:00
          </button>
          {TIME_SLOTS.map(slot => (
            <label key={slot}>
              <input
                type="checkbox"
                value={slot}
                checked={formData.availableTimeSlots.includes(slot)}
                onChange={(e) => handleCheckboxChange(e, 'availableTimeSlots')}
              />
              {slot}
            </label>
          ))}
        </div>

        <button type="submit">Add Teacher</button>
      </form>

      <div className="teachers-list">
        <h2>Teachers Added:</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Hours/Week</th>
              <th>Subjects</th>
              <th>Preferred Classrooms</th>
              <th>Available Days</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher, index) => (
              <tr key={index}>
                <td>{teacher.name}</td>
                <td>{teacher.hoursPerWeek}</td>
                <td>{teacher.subjects}</td>
                <td>{teacher.preferredClassrooms}</td>
                <td>{teacher.availableDays.join(', ')}</td>
                <td>
                  <button 
                    onClick={() => handleRemoveTeacher(index)}
                    style={{ backgroundColor: '#ff4444' }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="schedule-controls">
        <button onClick={generateSchedule}>Generate Schedule</button>
        <button onClick={exportSchedule}>Export Schedule</button>
      </div>

      {Object.keys(schedule).length > 0 && (
        <div className="schedule">
          <h2>Generated Schedule</h2>
          <table>
            <thead>
              <tr>
                <th>Time Slot</th>
                {DAYS.map(day => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map(slot => (
                <tr key={slot}>
                  <td>{slot}</td>
                  {DAYS.map(day => (
                    <td key={`${day}-${slot}`} style={{ minHeight: '80px', verticalAlign: 'top' }}>
                      {schedule[day][slot].map((entry, index) => (
                        <div
                          key={`${entry.teacher}-${entry.classroom}-${index}`}
                          className="clickable-event"
                          onClick={() => handleEventClick(entry, day, slot, index)}
                          style={{
                            padding: '8px',
                            margin: '4px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            backgroundColor: '#f9f9f9',
                            cursor: 'pointer'
                          }}
                        >
                          {entry.teacher}<br />
                          {entry.subject}<br />
                          {entry.classroom}
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPopup && editingEvent && (
        <div className="popup-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="popup" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            minWidth: '300px',
            maxWidth: '500px'
          }}>
            <h3>Edit Event</h3>
            <p><strong>Teacher:</strong> {editingEvent.teacher}</p>
            <p><strong>Subject:</strong> {editingEvent.subject}</p>
            <p><strong>Classroom:</strong> {editingEvent.classroom}</p>
            
            <div style={{ margin: '20px 0' }}>
              <label>
                <strong>Day:</strong>
                <select 
                  value={editingEvent.newDay} 
                  onChange={(e) => setEditingEvent({...editingEvent, newDay: e.target.value})}
                  style={{ marginLeft: '10px', padding: '5px' }}
                >
                  {DAYS.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </label>
            </div>
            
            <div style={{ margin: '20px 0' }}>
              <label>
                <strong>Time Slot:</strong>
                <select 
                  value={editingEvent.newSlot} 
                  onChange={(e) => setEditingEvent({...editingEvent, newSlot: e.target.value})}
                  style={{ marginLeft: '10px', padding: '5px' }}
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handlePopupCancel}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ccc',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handlePopupSave}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
