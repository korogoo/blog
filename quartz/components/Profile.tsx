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
  padding: 0.4rem 0 0.4rem;
}

.profile-image {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--lightgray);
}
`

export default (() => Profile) satisfies QuartzComponentConstructor
