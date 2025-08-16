document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('page-form');

  if (form) {
      form.addEventListener('submit', function(event) {
          event.preventDefault();

          const yearOfStudy = document.getElementById('year-of-study').value;
          const department = document.getElementById('department').value;
          const section = document.getElementById('sec').value;

          // Retrieve the email from URL parameters
          const urlParams = new URLSearchParams(window.location.search);
          const email = urlParams.get('email');

          fetch('http://localhost:3020/fetchStudents', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  year: yearOfStudy,
                  department: department,
                  section: section
              })
          })
          .then(response => response.json())
          .then(students => {
              localStorage.setItem('studentsData', JSON.stringify(students));

              if (email) {
                  console.log('Redirecting to localhost:3000/gemini.html with email:', decodeURIComponent(email));
                  // Redirect to localhost:3000/gemini.html with email as URL parameter
                  window.location.href = `http://localhost:3000/gemini.html?email=${email}`;
              } else {
                  console.error('Email parameter missing in URL');
              }
          })
          .catch(error => console.error('Error:', error));
      });
  }
});








//first
        // Redirect to the next form
//         window.location.href = 'http://localhost:3000';
//       })
//       .catch(error => console.error('Error:', error));
//     });
//   }
// });
//second

// const urlParams = new URLSearchParams(window.location.search);
//                         const email = urlParams.get('email');
                        
//                         if (email) {
//                             window.location.href = `http://localhost:3000/gemini.html?email=${email}`;
//                         } else {
//                             console.error('Email parameter missing in URL');
//                         }
//                     })
//                     .catch(error => console.error('Error:', error));
//                 });
//             }
//         });

