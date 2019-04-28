import React from "react";
import ReactDOM from "react-dom";
import { useEffect, useState } from "react";
import io from "socket.io-client";
import "bootstrap/dist/css/bootstrap.css";
import {
  Button,
  ButtonGroup,
  Alert,
  Input,
  InputGroup,
  InputGroupAddon,
  Col,
  UncontrolledTooltip,
  UncontrolledCollapse,
  CardBody,
  Modal,
  ModalHeader,
  ModalBody
} from "reactstrap";
import "./styles.scss";

const socket = io("https://api-search.glitch.me/");

const App = () => {
  const [input, setInput] = useState("");
  const [profilePhoto, setProfilePhoto] = useState({
    photo:
      "http://icons.iconarchive.com/icons/limav/flat-gradient-social/72/Github-icon.png",
    name: "GitHub Autorisation"
  });

  const [searchData, setSearchData] = useState("");
  const [pageClick, setPageClick] = useState(1);
  const [imgData, setImgData] = useState([]);
  const [toggleModal, setToggleModal] = useState({
    open: false,
    image: "",
    title: ""
  });

  const handlerInput = e => {
    setInput(e.target.value);
  };
  const handleClick = () => {
    if (profilePhoto.name !== "GitHub Autorisation") {
      if (input.trim() !== "") {
        socket.emit("submitFromClient", {
          submitData: input.trim(),
          submitName: profilePhoto.name
        });
      }
    } else {
      if (input.trim() !== "") {
        socket.emit("submitFromClient", {
          submitData: input.trim(),
          submitName: "Anonymous"
        });
      }
    }
    setInput("");

    socket.on("dataSearchFromServer", data => {
      if (data.allPreviousSearch.length <= 6) {
        setSearchData({
          name: data.name,
          yourSearch: data.search,
          allPreviousSearch: data.allPreviousSearch
        });
      } else {
        console.log(data.allPreviousSearch.length);
        let arr = data.allPreviousSearch.filter((item, i) => {
          if (i <= 6) {
            return item;
          }
        });
        arr.push("more than 6....");
        setSearchData({
          name: data.name,
          yourSearch: data.search,
          allPreviousSearch: arr
        });
      }
      socket.off();
    });
  };

  const handlePageClick = e => {
    if (e.target.value === "-") {
      setPageClick(pageClick - 1);
    } else if (e.target.value === "+") {
      setPageClick(pageClick + 1);
    }
  };

  if (input.trim() !== "") {
    socket.emit("inputFromClient", {
      input: input.trim(),
      pageClick: pageClick
    });
  }

  const handlerToggleModal = () => {
    setToggleModal(!toggleModal.open);
  };

  useEffect(() => {
    socket.on("imageFromServer", data => {
      imageFromServer(data);
      socket.off();
    });

    const imageFromServer = imagesData => {
      let imagesRender = [];
      imagesRender = imagesData.map(item => {
        return (
          <div className="Images" key={item.id}>
            <p title={item.tags}>
              <span
                className="btn btn-info"
                onClick={() => {
                  setToggleModal({
                    open: !toggleModal.open,
                    image: item.largeImageURL,
                    title: item.tags
                  });
                }}
              >
                <img src={item.previewURL} alt={item.tags} />
              </span>
              <br />

              <a
                className="btn btn-primary"
                role="button"
                href={item.pageURL}
                title={item.tags}
              >
                Page: {item.tags}
              </a>
            </p>
          </div>
        );
      });
      setImgData(imagesRender);
    };

    return () => window.removeEventListener("load", imageFromServer);
  });

  socket.on("photoProfile", data => {
    if (data.name !== undefined) {
      setProfilePhoto({
        photo: data.photo,
        name: data.name
      });
    }
    socket.off();
  });

  return (
    <div className="mx-auto">
      <div className="clearfix">
        <a
          className="float-right"
          href="https://api-search.glitch.me/auth/github"
          id={"Tooltip-git"}
        >
          <img
            className="rounded mb-0 border border-success"
            src={profilePhoto.photo}
            alt="github-autorisation"
            width="72"
          />
        </a>
        <h1 className="text-center ml-5">Pixabay Search</h1>
      </div>
      <Col sm="15" md={{ size: 4, offset: 4 }}>
        <InputGroup>
          <Input
            className="input-text"
            type="text"
            placeholder="Search images..."
            onChange={handlerInput}
            value={input}
          />
          <InputGroupAddon addonType="append">
            {input === "" ? "Search..." : input}
          </InputGroupAddon>
          <InputGroupAddon>
            <Button
              id="get-json"
              color="warning"
              className="get-json"
              onClick={handleClick}
            >
              Get JSON
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </Col>

      <UncontrolledTooltip placement="left" target={"Tooltip-git"}>
        {profilePhoto.name}
      </UncontrolledTooltip>
      <div className="clearfix">
        <ButtonGroup className="d-inline-flex p-2 float-left">
          <Button
            outline
            color="info"
            className="prev-but"
            onClick={handlePageClick}
            value="-"
          >
            Previous Page
          </Button>
          <Button
            outline
            color="info"
            className="next-but"
            onClick={handlePageClick}
            value="+"
          >
            Next page
          </Button>
        </ButtonGroup>
        <UncontrolledCollapse toggler="#get-json">
          <CardBody className="d-inline-flex p-2">
            <Alert color="warning">
              <code>{JSON.stringify(searchData)}</code>
            </Alert>
          </CardBody>
        </UncontrolledCollapse>
      </div>

      <div className="d-flex align-content-around justify-content-around flex-wrap">
        {imgData}
      </div>

      <Modal
        className="modal-xl"
        isOpen={toggleModal.open}
        toggle={handlerToggleModal}
      >
        <ModalHeader className="bg-info" toggle={handlerToggleModal}>
          {toggleModal.title}
        </ModalHeader>

        <ModalBody className="bg-info">
          <img
            className="mw-100"
            src={toggleModal.image}
            alt={toggleModal.title}
          />
        </ModalBody>
      </Modal>
    </div>
  );
};

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
