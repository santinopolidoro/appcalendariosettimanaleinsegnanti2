import React, { useState, useEffect } from 'react';
import './App.css';
import { saveTeachersToDb, loadTeachersFromDb, saveScheduleToDb, loadScheduleFromDb } from './services/teacherData';

const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
const TIME_SLOTS = [
  '8:00-9:00', '9:00-10:00', '10:00-11:00', '11:00-12:00',
  '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00'
];

function App() {
  const [teachers, setTeachers] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [showTeacherPopup, setShowTeacherPopup] = useState(false);

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

  const handleEditTeacher = (index) => {
    setEditingTeacher({...teachers[index], index});
    setShowTeacherPopup(true);
  };

  const handleTeacherPopupSave = () => {
    const { index, ...teacherData } = editingTeacher;
    setTeachers(prev => {
      const newTeachers = [...prev];
      newTeachers[index] = teacherData;
      return newTeachers;
    });
    setShowTeacherPopup(false);
    setEditingTeacher(null);
  };

  const handleTeacherPopupCancel = () => {
    setShowTeacherPopup(false);
    setEditingTeacher(null);
  };

  const handleTeacherInputChange = (e) => {
    const { name, value } = e.target;
    setEditingTeacher(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTeacherCheckboxChange = (e, type) => {
    const { value, checked } = e.target;
    setEditingTeacher(prev => ({
      ...prev,
      [type]: checked 
        ? [...prev[type], value]
        : prev[type].filter(item => item !== value)
    }));
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

    let hourHeaders = ['Insegnante'];
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
    a.download = 'orario-insegnanti.csv';
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
  
    // Prima passiamo attraverso tutti gli insegnanti per assegnare le ore per classe
    teachers.forEach(teacher => {
      // Inizializza il conteggio delle ore per classe
      const classroomHoursCounts = {};
      const classrooms = teacher.preferredClassrooms.split(',').map(c => c.trim());
      
      // Calcola il totale delle ore settimanali dell'insegnante
      const totalWeeklyHours = parseInt(teacher.hoursPerWeek);
      
      // Distribuisci le ore tra le classi in base ai limiti specificati
      classrooms.forEach(classroom => {
        // Se è specificato un limite per questa classe, usalo, altrimenti distribuisci equamente
        const maxHoursForClass = teacher.classroomHours[classroom] || Math.ceil(totalWeeklyHours / classrooms.length);
        classroomHoursCounts[classroom] = maxHoursForClass;
      });
      
      // Ora assegna le ore per ogni classe
      classrooms.forEach(classroom => {
        let remainingHoursForClass = classroomHoursCounts[classroom];
        const availableDays = [...teacher.availableDays];
        const maxPerDay = parseInt(teacher.maxHoursPerDay) || 8;
        
        // Continua finché ci sono ore da assegnare per questa classe
        while (remainingHoursForClass > 0 && availableDays.length > 0) {
          // Ordina i giorni in base al numero di ore già assegnate (per distribuire equamente)
          availableDays.sort((a, b) => {
            const hoursOnDayA = Object.values(newSchedule[a]).flat()
              .filter(entry => entry.teacher === teacher.name).length;
            const hoursOnDayB = Object.values(newSchedule[b]).flat()
              .filter(entry => entry.teacher === teacher.name).length;
            return hoursOnDayA - hoursOnDayB;
          });
          
          // Prendi il giorno con meno ore assegnate
          const currentDay = availableDays[0];
          
          // Verifica quante ore sono già assegnate in questo giorno
          const hoursOnThisDay = Object.values(newSchedule[currentDay]).flat()
            .filter(entry => entry.teacher === teacher.name).length;
          
          // Se abbiamo raggiunto il massimo di ore per questo giorno, rimuovilo e continua
          if (hoursOnThisDay >= maxPerDay) {
            availableDays.shift();
            continue;
          }
          
          // Trova gli slot disponibili per questo giorno
          const availableSlots = [...teacher.availableTimeSlots].filter(slot => {
            // Verifica se l'insegnante è già presente in questo slot
            const isTeacherInSlot = newSchedule[currentDay][slot].some(entry => entry.teacher === teacher.name);
            // Verifica se la classe è già occupata in questo slot
            const isClassroomOccupied = newSchedule[currentDay][slot].some(entry => entry.classroom === classroom);
            
            return !isTeacherInSlot && !isClassroomOccupied;
          });
          
          // Se non ci sono slot disponibili, rimuovi il giorno e continua
          if (availableSlots.length === 0) {
            availableDays.shift();
            continue;
          }
          
          // Ordina gli slot in base all'orario (prima mattina, poi pomeriggio)
          availableSlots.sort((a, b) => {
            const hourA = parseInt(a.split(':')[0]);
            const hourB = parseInt(b.split(':')[0]);
            return hourA - hourB;
          });
          
          // Assegna l'ora nel primo slot disponibile
          const slotToAssign = availableSlots[0];
          
          newSchedule[currentDay][slotToAssign].push({
            teacher: teacher.name,
            subject: teacher.subjects.split(',')[0].trim(),
            classroom: classroom
          });
          
          remainingHoursForClass--;
          
          // Se abbiamo assegnato tutte le ore per questa classe, esci dal ciclo
          if (remainingHoursForClass === 0) {
            break;
          }
        }
      });
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
            placeholder="Nome insegnante"
            required
          />
        </div>
        <div>
          <input
            type="number"
            name="hoursPerWeek"
            value={formData.hoursPerWeek}
            onChange={handleInputChange}
            placeholder="Ore alla settimana"
            required
          />
        </div>
        <div>
          <input
            type="text"
            name="subjects"
            value={formData.subjects}
            onChange={handleInputChange}
            placeholder="Materie (separate con virgola)"
            required
          />
        </div>
        <div>
          <input
            type="text"
            name="preferredClassrooms"
            value={formData.preferredClassrooms}
            onChange={handleInputChange}
            placeholder="Classi (separate con virgola)"
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
            placeholder="Massimo ore al giorno"
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
                Massimo ore in {classroom.trim()}:
                <input
                  type="number"
                  min="0"
                  max={formData.hoursPerWeek}
                  value={formData.classroomHours[classroom.trim()] || ''}
                  onChange={(e) => handleClassroomHoursChange(classroom, e.target.value)}
                  placeholder="Max ore"
                />
              </label>
            </div>
          )
        )}

        <div className="availability">
          <h3>Giorni in cui è disponibile:</h3>
          <button 
            type="button" 
              onClick={handleSelectAllDays}
              style={{ marginBottom: '10px' }}
            >
              Seleziona tutta la mattina
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
          <h3>Slot orari disponibili:</h3>
          <button 
            type="button" 
            onClick={handleSelectDefaultHours}
            style={{ marginBottom: '10px' }}
          >
            Seleziona tutto il giorno
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

        <button type="submit">Aggiungi insegnante</button>
      </form>

      <div className="teachers-list">
        <h2>Insegnanti Aggiunti:</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Ore/settimana</th>
              <th>Materie</th>
              <th>Classi</th>
              <th>Giorni</th>
              <th>Azioni</th>
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
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={() => handleEditTeacher(index)}
                      style={{ backgroundColor: '#4CAF50' }}
                    >
                      Modifica
                    </button>
                    <button 
                      onClick={() => handleRemoveTeacher(index)}
                      style={{ backgroundColor: '#ff4444' }}
                    >
                      Rimuovi
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="schedule-controls">
        <button onClick={generateSchedule}>Crea orario</button>
        <button onClick={exportSchedule}>Esporta orario</button>
      </div>

      {Object.keys(schedule).length > 0 && (
        <div className="schedule">
          <h2>Orario</h2>
          <table>
            <thead>
              <tr>
                <th>Slot orari</th>
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

      {showTeacherPopup && editingTeacher && (
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
            width: '80%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2>Modifica Insegnante</h2>
            
            <div style={{ margin: '10px 0' }}>
              <label>
                <strong>Nome:</strong>
                <input
                  type="text"
                  name="name"
                  value={editingTeacher.name}
                  onChange={handleTeacherInputChange}
                  style={{ marginLeft: '10px', padding: '5px', width: '70%' }}
                  required
                />
              </label>
            </div>
            
            <div style={{ margin: '10px 0' }}>
              <label>
                <strong>Ore alla settimana:</strong>
                <input
                  type="number"
                  name="hoursPerWeek"
                  value={editingTeacher.hoursPerWeek}
                  onChange={handleTeacherInputChange}
                  style={{ marginLeft: '10px', padding: '5px', width: '70%' }}
                  required
                />
              </label>
            </div>
            
            <div style={{ margin: '10px 0' }}>
              <label>
                <strong>Materie:</strong>
                <input
                  type="text"
                  name="subjects"
                  value={editingTeacher.subjects}
                  onChange={handleTeacherInputChange}
                  style={{ marginLeft: '10px', padding: '5px', width: '70%' }}
                  required
                />
              </label>
            </div>
            
            <div style={{ margin: '10px 0' }}>
              <label>
                <strong>Classi:</strong>
                <input
                  type="text"
                  name="preferredClassrooms"
                  value={editingTeacher.preferredClassrooms}
                  onChange={handleTeacherInputChange}
                  style={{ marginLeft: '10px', padding: '5px', width: '70%' }}
                  required
                />
              </label>
            </div>
            
            {/* Ore per classe */}
            <div style={{ margin: '20px 0' }}>
              <h3>Ore per classe:</h3>
              {editingTeacher.preferredClassrooms.split(',').map(classroom => 
                classroom.trim() && (
                  <div key={classroom.trim()} style={{ margin: '10px 0' }}>
                    <label>
                      <strong>Massimo ore in {classroom.trim()}:</strong>
                      <input
                        type="number"
                        min="0"
                        max={editingTeacher.hoursPerWeek}
                        value={editingTeacher.classroomHours?.[classroom.trim()] || ''}
                        onChange={(e) => {
                          const classroom_trim = classroom.trim();
                          const hours = parseInt(e.target.value) || 0;
                          setEditingTeacher(prev => ({
                            ...prev,
                            classroomHours: {
                              ...prev.classroomHours,
                              [classroom_trim]: hours
                            }
                          }));
                        }}
                        style={{ marginLeft: '10px', padding: '5px', width: '70px' }}
                        placeholder="Max ore"
                      />
                    </label>
                  </div>
                )
              )}
            </div>
            
            <div style={{ margin: '10px 0' }}>
              <label>
                <strong>Ore massime al giorno:</strong>
                <input
                  type="number"
                  name="maxHoursPerDay"
                  value={editingTeacher.maxHoursPerDay}
                  onChange={handleTeacherInputChange}
                  style={{ marginLeft: '10px', padding: '5px', width: '70%' }}
                />
              </label>
            </div>
            
            <div style={{ margin: '20px 0' }}>
              <h3>Giorni disponibili:</h3>
              {DAYS.map(day => (
                <label key={day} style={{ display: 'block', margin: '5px 0' }}>
                  <input
                    type="checkbox"
                    value={day}
                    checked={editingTeacher.availableDays.includes(day)}
                    onChange={(e) => handleTeacherCheckboxChange(e, 'availableDays')}
                  />
                  {day}
                </label>
              ))}
            </div>
            
            <div style={{ margin: '20px 0' }}>
              <h3>Slot orari disponibili:</h3>
              {TIME_SLOTS.map(slot => (
                <label key={slot} style={{ display: 'block', margin: '5px 0' }}>
                  <input
                    type="checkbox"
                    value={slot}
                    checked={editingTeacher.availableTimeSlots.includes(slot)}
                    onChange={(e) => handleTeacherCheckboxChange(e, 'availableTimeSlots')}
                  />
                  {slot}
                </label>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                onClick={handleTeacherPopupCancel}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ccc',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Annulla
              </button>
              <button 
                onClick={handleTeacherPopupSave}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Salva
              </button>
            </div>
          </div>
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
            <h3>Modifica slot</h3>
            <p><strong>Insegnante:</strong> {editingEvent.teacher}</p>
            <p><strong>Materia:</strong> {editingEvent.subject}</p>
            <p><strong>Classe:</strong> {editingEvent.classroom}</p>
            
            <div style={{ margin: '20px 0' }}>
              <label>
                <strong>Giorno:</strong>
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
                <strong>Ora:</strong>
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

      <div className="data-management-controls" style={{ 
        marginTop: '30px', 
        padding: '20px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h3>Data Management</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <button 
            onClick={() => {
              // Save all data to CSV file
              try {
                // Import the CSV utility functions
                import('./utils/csvUtils').then(({ convertToCSV, downloadCSV }) => {
                  // Convert data to CSV format
                  const csvData = convertToCSV(teachers, schedule);
                  
                  // Download the CSV file
                  downloadCSV(csvData, 'salvataggio_orario_insegnanti.csv');
                  
                  alert('Tutti i dati sono stati salvati nel file CSV!');
                });
              } catch (error) {
                console.error('Errore durante il salvataggio dei dati nel file CSV:', error);
                alert('Salvataggio dei dati nel file CSV fallito. Si prega di riprovare.');
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Salva tutti i dati
          </button>
          <button 
            onClick={() => {
              // Create a file input element
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.accept = '.csv';
              
              // Handle file selection
              fileInput.onchange = (event) => {
                const file = event.target.files[0];
                if (!file) {
                  return;
                }
                
                // Import the CSV utility functions
                import('./utils/csvUtils').then(({ readCSVFile, parseCSV }) => {
                  // Read the CSV file
                  readCSVFile(file)
                    .then(csvData => {
                      // Parse the CSV data
                      const { teachers: importedTeachers, schedule: importedSchedule } = parseCSV(csvData);
                      
                      // Update the state with the imported data
                      setTeachers(importedTeachers);
                      setSchedule(importedSchedule);
                      
                      alert('Tutti i dati sono stati importati dal file CSV!');
                    })
                    .catch(error => {
                      console.error('Errore nella lettura dei dati dal file CSV:', error);
                      alert('Importazione dei dati dal file CSV fallita. Si prega di riprovare.');
                    });
                });
              };
              
              // Trigger the file input click
              fileInput.click();
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Importa tutti i dati
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
