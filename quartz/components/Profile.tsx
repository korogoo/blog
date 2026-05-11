import { QuartzComponentConstructor } from "./types"

function Profile() {
  return (
    <div class="profile-container">
      <img src="/static/profile.png" alt="Profile" class="profile-image" />
    </div>
  )
}

Profile.css = `
.profile-container {
  display: flex;
  justify-content: center;
  padding: 1.5rem 1rem 0.5rem;
}

.profile-image {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--lightgray);
}
`

export default (() => Profile) satisfies QuartzComponentConstructor
