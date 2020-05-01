import React from 'react'
import { Button, Form, Modal, TextArea, Message } from 'semantic-ui-react'
import { submitFeedback } from 'services/feedback'

const initialState = {
  message: '',
  formOpen: false,
  feedbackSubmitted: false
}

class Feedback extends React.PureComponent {
  constructor (props) {
    super(props)

    this.state = initialState

    this.handleOpenModal = () => {
      this.setState({
        formOpen: true
      })
    }

    this.handleCloseModal = () => {
      this.setState(initialState)
    }

    this.handleSubmit = () => {
      const { message } = this.state
      submitFeedback(message).then(() => {
        this.setState({
          feedbackSubmitted: true
        })
      })
    }
  }

  render () {
    const {
      message,
      formOpen,
      feedbackSubmitted
    } = this.state

    return (
      <Modal
        closeIcon
        centered={false}
        size='tiny'
        open={formOpen}
        onClose={this.handleCloseModal}
        trigger={
          <div style={{
            display: 'block',
            position: 'fixed',
            top: '80%',
            right: '-62px', // Adjusted for rotation
            transform: 'rotate(90deg)'
          }}
          >
            <Button
              style={{
                borderTopLeftRadius: '0',
                borderTopRightRadius: '0'
              }} onClick={this.handleOpenModal}
            ><i className='envelope outline icon' />Got an opinion?
            </Button>
          </div>
        }
      >
        <Modal.Header>Let us know!</Modal.Header>
        <Modal.Content>
          {!feedbackSubmitted &&
            <Form>
              <Form.Field>
                <TextArea value={message} onChange={(e) => this.setState({ message: e.target.value })} />
              </Form.Field>
              <Button type='submit' positive onClick={this.handleSubmit}>Submit</Button>
            </Form>}
          {feedbackSubmitted &&
            <Message positive>
              <p>Thanks for your feedback</p>
            </Message>}
        </Modal.Content>
      </Modal>
    )
  }
}

export default Feedback
