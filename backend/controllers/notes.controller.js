// ==========================================
// NOTES CRUD SECTION
// This section contains the logic to create,
// read, update and delete user notes.
// ==========================================

const db = require("../database/database");

// Obtener la hora actual en zona horaria de Costa Rica (UTC-6)
function getCostaRicaTime() {
  const now = new Date();
  // Convertir a UTC
  const utcTime = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000);
  // Restar 6 horas para Costa Rica
  const costaRicaTime = new Date(utcTime.getTime() - (6 * 60 * 60 * 1000));
  return costaRicaTime.toISOString().replace('T', ' ').substring(0, 19);
}

// Convertir fecha UTC a zona horaria de Costa Rica (UTC-6)
function convertToCostaRicaTime(utcDateString) {
  const date = new Date(utcDateString);
  // Convertir a UTC
  const utcTime = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
  // Restar 6 horas para Costa Rica
  const costaRicaTime = new Date(utcTime.getTime() - (6 * 60 * 60 * 1000));
  return costaRicaTime.toISOString().replace('T', ' ').substring(0, 19);
}

function getAllNotes(req, res) {
  const sql = `
    SELECT id, title, content, user_id, created_at, updated_at
    FROM notes
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `;

  db.all(sql, [req.user.id], (error, notes) => {
    if (error) {
      return res.status(500).json({
        message: "Could not get notes."
      });
    }

    // Convertir fechas a zona horaria de Costa Rica
    const notesWithCostaRicaTime = notes.map(note => ({
      ...note,
      created_at: convertToCostaRicaTime(note.created_at),
      updated_at: convertToCostaRicaTime(note.updated_at)
    }));

    return res.json(notesWithCostaRicaTime);
  });
}

function getNoteById(req, res) {
  const sql = `
    SELECT id, title, content, user_id, created_at, updated_at
    FROM notes
    WHERE id = ? AND user_id = ?
  `;

  db.get(sql, [req.params.id, req.user.id], (error, note) => {
    if (error) {
      return res.status(500).json({
        message: "Could not get the note."
      });
    }

    if (!note) {
      return res.status(404).json({
        message: "Note not found."
      });
    }

    // Convertir fechas a zona horaria de Costa Rica
    const noteWithCostaRicaTime = {
      ...note,
      created_at: convertToCostaRicaTime(note.created_at),
      updated_at: convertToCostaRicaTime(note.updated_at)
    };

    return res.json(noteWithCostaRicaTime);
  });
}

function createNote(req, res) {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      message: "Title and content are required."
    });
  }

  const sql = "INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)";

  db.run(sql, [title, content, req.user.id], function insertNote(error) {
    if (error) {
      return res.status(500).json({
        message: "Could not create the note."
      });
    }

    const formattedTime = getCostaRicaTime();

    return res.status(201).json({
      message: "Note created successfully.",
      note: {
        id: this.lastID,
        title,
        content,
        user_id: req.user.id,
        created_at: formattedTime,
        updated_at: formattedTime
      }
    });
  });
}

function updateNote(req, res) {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      message: "Title and content are required."
    });
  }

  const sql = `
    UPDATE notes
    SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `;

  db.run(sql, [title, content, req.params.id, req.user.id], function updateRow(error) {
    if (error) {
      return res.status(500).json({
        message: "Could not update the note."
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        message: "Note not found."
      });
    }

    const formattedTime = getCostaRicaTime();

    return res.json({
      message: "Note updated successfully.",
      updated_at: formattedTime
    });
  });
}

function deleteNote(req, res) {
  const sql = "DELETE FROM notes WHERE id = ? AND user_id = ?";

  db.run(sql, [req.params.id, req.user.id], function deleteRow(error) {
    if (error) {
      return res.status(500).json({
        message: "Could not delete the note."
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        message: "Note not found."
      });
    }

    return res.json({
      message: "Note deleted successfully."
    });
  });
}

module.exports = {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote
};
